import { AcceptTOS, AgeConfirmation, PartnerPlugins, RegisterUser, SelectPlan, SpecialOffers } from "@/app/components/regie";
import { Context, MachineEvent, Task, engineV1 as engine } from "@/app/api/reasoning";
import { ActionType } from "@/app/utils";
import { regieProgrammer, regieSolver, regieEvaluate } from "@/app/api/reasoning/prompts";
import { UnsafeQuestion, UnsupportedQuestion } from "@/app/components/chemli";

function getFunctionCatalog(dispatch: (action: ActionType) => void) {
    return new Map<string, Task>([
        [
            "AcceptTOS",
            {
                description:
                    "Required step that allows the user to accept or reject the terms of service",
                // this is an example of a visual state that requires user interaction
                component: (context: Context, event?: MachineEvent) => <AcceptTOS />,
                implementation: (context: Context, event?: MachineEvent) => {
                    console.log('AcceptTOS implementation called');
                },
                transitions: new Map<"CONTINUE" | "ERROR", (context: Context, event: MachineEvent) => boolean>([
                    [
                        "CONTINUE",
                        // this is an example of a deterministic function that is invoked as part of evaluating transitions
                        // it can do whatever you like and take into account the current state of the world found on the context
                        // The results of the implementation function should be include included in the payload of the incoming event
                        // in this case we verify the user accepted the TOS
                        (context: Context, event: MachineEvent) => event.payload?.AcceptTOS?.accepted
                    ]
                ]),
            },
        ],
        [
            "AgeConfirmation",
            {
                description: "Required step that allows the user to confirm they are at least 18 years of age",
                // this is an example of how you can render a component while the implementation function executes
                component: (context: Context, event?: MachineEvent) => <AgeConfirmation />,
                implementation: (context: Context, event?: MachineEvent) => {
                    console.log('AgeConfirmation implementation called');
                },
                transitions: new Map<"CONTINUE" | "ERROR", (context: Context, event: MachineEvent) => boolean>([
                    [
                        "CONTINUE",
                        // this is an example of a deterministic function that is invoked as part of evaluating transitions
                        // it can do whatever you like and take into account the current state of the world found on the context
                        // The results of the implementation function should be include included in the payload of the incoming event
                        // in this case we verify the user is at least 18
                        (context: Context, event: MachineEvent) => event.payload?.AgeConfirmation?.confirmed
                    ]
                ]),
            },
        ],
        [
            "PartnerPlugins",
            {
                description:
                    "Optional step allows the user to select partner plugins they can sign up for",
                component: (context: Context, event?: MachineEvent) => <PartnerPlugins />,
                implementation: (context: Context, event?: MachineEvent) => {
                    console.log('PartnerPlugins implementation called');
                },
            },
        ],
        [
            "RegisterUser",
            {
                description:
                    "Required step to collect the users personal information",
                component: (context: Context, event?: MachineEvent) => <RegisterUser />,
                implementation: (context: Context, event?: MachineEvent) => {
                    console.log('RegisterUser implementation called');
                },
            },
        ],
        [
            "SelectPlan",
            {
                description:
                    "Required step that allows the user to select the subscription tier they would like",
                component: (context: Context, event?: MachineEvent) => <SelectPlan />,
                implementation: (context: Context, event?: MachineEvent) => {
                    console.log('SelectPlan implementation called');
                },
            },
        ],
        [
            "SpecialOffers",
            {
                description: "Optional step that allows the user to select the special offers they would like",
                component: (context: Context, event?: MachineEvent) => <SpecialOffers />,
                implementation: (context: Context, event?: MachineEvent) => {
                    console.log('SpecialOffers implementation called');
                },
            },
        ],
        [
            "UnsupportedQuestion",
            {
                description:
                    "Default state to display for unsupported questions",
                component: (context: Context, event?: MachineEvent) => <UnsupportedQuestion />,
                implementation: (context: Context, event?: MachineEvent) => {
                    console.log('UnsupportedQuestion implementation called');
                }
            },
        ],
        [
            "UnsafeQuestion",
            {
                description:
                    "Default state to display for unsafe questions",
                component: (context: Context, event?: MachineEvent) => <UnsafeQuestion />,
                implementation: (context: Context, event?: MachineEvent) => {
                    console.log('UnsafeQuestion implementation called');
                },
            },
        ]
    ]);
}

function getToolsCatalog() {
    return new Map<string, { description: string }>([
        [
            "AcceptTOS",
            {
                description:
                    "Required step that allows the user to accept or reject the terms of service",
            },
        ],
        [
            "AgeConfirmation",
            {
                description: "Required step that allows the user to confirm they are at least 18 years of age",
            },
        ],
        [
            "PartnerPlugins",
            {
                description:
                    "Optional step allows the user to select partner plugins they can sign up for",
            },
        ],
        [
            "RegisterUser",
            {
                description:
                    "Required step to collect the users personal information",
            },
        ],
        [
            "SelectPlan",
            {
                description:
                    "Required step that allows the user to select the subscription tier they would like",
            },
        ],
        [
            "SpecialOffers",
            {
                description: "Optional step that allows the user to select the special offers they would like",
            },
        ],
        [
            "UnsupportedQuestion",
            {
                description: "Default state to display for unsupported questions",
            },
        ],
        [
            "UnsafeQuestion",
            {
                description: "Default state to display for unsafe questions",
            },
        ],
    ]);
}

function getMetaData() {
    return {
        title: 'I am Regie, the AI powered user registration system.',
        description: 'Tell  me any special requests you have in the registration process and I\'ll taylor your experience if possible.',
    }
}

export {
    regieProgrammer,
    regieSolver,
    regieEvaluate,
    getFunctionCatalog as regieFunctionCatalog,
    getToolsCatalog as regieToolsCatalog,
    getMetaData as regieMetaData,
}