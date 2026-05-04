import type { PreSignUpTriggerHandler } from "aws-lambda";

export const handler: PreSignUpTriggerHandler = async (event) => {
    const email = event.request.userAttributes.email;
    console.log("PRE SIGN UP TRIGGER RUNNING");
    console.log("EMAIL:", email);
    if (email?.endsWith("@westminster.ac.uk") || email?.endsWith("@my.westminster.ac.uk")) 
    {
        return event;
    }
    
    throw new Error("Only westminster.ac.uk accounts are allowed.");
};