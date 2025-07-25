import { createActor } from "xstate";
import { chatCompletion, chatCompletionStream } from "@/app/api/openai";

import {
    StateConfig,
    EvaluationInput,
    EvaluatorResult,
    ReasoningEngine,
    programV1,
    Prompt,
} from ".";

import { extractJsonFromBackticks } from "@/app/utils";


async function solve(query: string, solver: Prompt): Promise<string> {
    // TODO remove the use of the threads API and go with completions
    const { user, system } = await solver(query);

    const result = await chatCompletion({
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        model: "o4-mini" // Updated to mini model
    });
    const value = result;
    return value || '';
}

async function* solveStream(query: string, solver: Prompt, onProgress?: (stage: string) => void): AsyncGenerator<{type: 'progress' | 'content', data: string}, string> {
    const { user, system } = await solver(query);
    
    onProgress?.('Generating solution...');
    yield { type: 'progress', data: 'Generating solution...' };
    
    let fullResult = '';
    for await (const chunk of chatCompletionStream({
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        model: "o4-mini"
    })) {
        fullResult += chunk;
        yield { type: 'content', data: chunk };
    }
    
    onProgress?.('Solution complete');
    yield { type: 'progress', data: 'Solution complete' };
    
    return fullResult || '';
}

async function program(query: string, functionCatalog: string, programmer: Prompt): Promise<StateConfig[]> {
    const { user, system } = await programmer(query, functionCatalog);

    const result = await chatCompletion({
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        model: "o4-mini", // Updated to mini model
        // response_format: { type: "json_object" }
    });
    const value = result || '';
    let unwrapped = extractJsonFromBackticks(value) || value;

    console.log(`programmer generated the following unchecked solution: ${unwrapped}`);

    // check the quality of the result
    try {
        JSON.parse(unwrapped)
    } catch (e) {
        const result = await chatCompletion({
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
                {
                    role: 'user', content: `your generated solution:
                ${unwrapped}
                generated the following error:
                ${(e as Error).message}
                Ensure the JSON is valid and does not contain any trailing commas, correct quotes, etc
                Only respond with the updated JSON! Your response will be sent to JSON.parse
                ` },
            ],
            model: "o4-mini",
            //response_format: { type: "json_object" }
        });
        const value = result || '';
        unwrapped = extractJsonFromBackticks(value) || value;
    }
    let states: StateConfig[] = JSON.parse(unwrapped);

    // make sure the state ID's are valid
    const notFound = states.map((state) => {
        if (state.type != 'parallel' &&
            state.id !== 'success' &&
            state.id !== 'failure' &&
            functionCatalog.indexOf(state.id) < 0) {
            return state;
        }
        return undefined;
    })
        .filter((item) => item !== undefined)
        .map((item) => item?.id);
    if (notFound.length > 0) {
        // TODO, return a recursive call to program if max count has not been exceeded
        const result = await chatCompletion({
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
                {
                    role: 'user', content: `your previous answer generated the following errors:
                Unknown state ID encountered: ${notFound.join(',')}
                Replace the unknown state IDs with valid IDs found in the function catalog below:
                ###### start function catalog ######
                ${functionCatalog}
                ###### end function catalog ######
                Do not modify the state machine in any other way!
                Only respond with the updated JSON and don't be chatty! Your response will be sent to JSON.parse
                ` },
            ],
            model: "o4-mini",
            //response_format: { type: "json_object" }
        });
        const value = result || '';
        // TODO retest valid states by moving logic to a util function
        unwrapped = extractJsonFromBackticks(value) || value;
    }
    console.log(`programmer returned: ${unwrapped}`);
    return JSON.parse(unwrapped) as StateConfig[];
}

async function* programStream(query: string, functionCatalog: string, programmer: Prompt, onProgress?: (stage: string) => void): AsyncGenerator<{type: 'progress' | 'content', data: string}, StateConfig[]> {
    onProgress?.('Preparing program generation...');
    yield { type: 'progress', data: 'Preparing program generation...' };
    
    const { user, system } = await programmer(query, functionCatalog);

    onProgress?.('Generating state machine configuration...');
    yield { type: 'progress', data: 'Generating state machine configuration...' };

    let fullResult = '';
    for await (const chunk of chatCompletionStream({
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        model: "o4-mini"
    })) {
        fullResult += chunk;
        yield { type: 'content', data: chunk };
    }
    
    const value = fullResult || '';
    let unwrapped = extractJsonFromBackticks(value) || value;

    console.log(`programmer generated the following unchecked solution: ${unwrapped}`);

    // check the quality of the result
    try {
        JSON.parse(unwrapped)
    } catch (e) {
        onProgress?.('Fixing JSON validation errors...');
        yield { type: 'progress', data: 'Fixing JSON validation errors...' };
        
        const result = await chatCompletion({
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
                {
                    role: 'user', content: `your generated solution:
                ${unwrapped}
                generated the following error:
                ${(e as Error).message}
                Ensure the JSON is valid and does not contain any trailing commas, correct quotes, etc
                Only respond with the updated JSON! Your response will be sent to JSON.parse
                ` },
            ],
            model: "o4-mini",
        });
        const value = result || '';
        unwrapped = extractJsonFromBackticks(value) || value;
    }
    let states: StateConfig[] = JSON.parse(unwrapped);

    // make sure the state ID's are valid
    const notFound = states.map((state) => {
        if (state.type != 'parallel' &&
            state.id !== 'success' &&
            state.id !== 'failure' &&
            functionCatalog.indexOf(state.id) < 0) {
            return state;
        }
        return undefined;
    })
        .filter((item) => item !== undefined)
        .map((item) => item?.id);
    if (notFound.length > 0) {
        onProgress?.('Validating state IDs...');
        yield { type: 'progress', data: 'Validating state IDs...' };
        
        const result = await chatCompletion({
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
                {
                    role: 'user', content: `your previous answer generated the following errors:
                Unknown state ID encountered: ${notFound.join(',')}
                Replace the unknown state IDs with valid IDs found in the function catalog below:
                ###### start function catalog ######
                ${functionCatalog}
                ###### end function catalog ######
                Do not modify the state machine in any other way!
                Only respond with the updated JSON and don't be chatty! Your response will be sent to JSON.parse
                ` },
            ],
            model: "o4-mini",
        });
        const value = result || '';
        unwrapped = extractJsonFromBackticks(value) || value;
    }
    
    onProgress?.('Program generation complete');
    yield { type: 'progress', data: 'Program generation complete' };
    
    console.log(`programmer returned: ${unwrapped}`);
    return JSON.parse(unwrapped) as StateConfig[];
}

async function evaluate(input: EvaluationInput, evaluate: Prompt): Promise<EvaluatorResult> {
    let evaluation = {
        rating: 0,
        correct: false,
    }
    try {
        const machine = programV1(input.states, input.tools!);
        const { user, system } = await evaluate(input.query, JSON.stringify(input.states));

        // see if the machine compiles
        // In XState v5, we create an actor directly with the machine
        // The machine already has initial context defined in generateStateMachineConfig
        const machineExecution = createActor(machine);

        evaluation = {
            rating: 5,
            correct: true,
        }
        /* TODO we need to fix this by allowing it to receive the message history so the model can evaluate the conversation
        then the model can evaluate the conversation
        // Now have the evaluator evaluate the result
        const result = await chatCompletion({
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
            model: "gpt-4", // gpt-4-0125-preview, gpt-4
            //response_format: { type: "json_object" } gpt-4-0125-preview
        });
        const value = result || '';
        let unwrapped = extractJsonFromBackticks(value) || value;

        // check the quality of the result
        try {
            evaluation = JSON.parse(unwrapped);
        } catch (e) {
            const result = await chatCompletion({
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user },
                    {
                        role: 'user', content: `your generated evaluation:
                ${unwrapped}
                generated the following error:
                ${(e as Error).message}
                Ensure the JSON is valid and does not contain any trailing commas, correct quotes, etc
                Only respond with the updated JSON! Your response will be sent to JSON.parse
                ` },
                ],
                model: "gpt-4",
                //response_format: { type: "json_object" }
            });
            const value = result || '';
            unwrapped = extractJsonFromBackticks(value) || value;
            evaluation = JSON.parse(unwrapped);
        }
        */
    } catch (e) {
        return {
            rating: 0,
            error: e as Error,
        };
    }
    // TODO better evaluation. For now if it compiles we are good. When we have evaluator models we'll expand
    console.log(`evaluator responded with: ${JSON.stringify(evaluation)}`);
    return evaluation;
}

async function transition(taskList: string, currentState: string, payload: string, aiTransition: Prompt): Promise<string> {
    const { user, system } = await aiTransition(taskList, currentState, payload);

    const result = await chatCompletion({
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        model: "o4-mini", // Updated to mini model, gpt-4o
        //response_format: { type: "json_object" } gpt-4-0125-preview
    });
    let value = result!;
    console.log(`engine.v2.ts.transition result is: ${value}`);
    // TODO improve retry mechanism
    if (currentState.indexOf(value) < 0) {
        const result = await chatCompletion({
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
                {
                    role: 'user', content: `your generated solution:
                ${value}
                does not include a valid transition ID! Make sure your are picking a transition ID from the provided state's transitions array
                Do not be chatty!
                ` },
            ],
            model: "o4-mini", // Updated to mini model, gpt-4o
        });
        value = result!;
        if (currentState.indexOf(value) < 0) {
            throw new Error(`Invalid model response: ${value}`);
        }
    }

    return value;
}

const implementation: ReasoningEngine = {
    solver: { solve, solveStream },
    programmer: { program, programStream },
    evaluator: { evaluate },
    logic: { transition }
};

export default implementation;
