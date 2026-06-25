import { Amplify } from "aws-amplify";
// Use the frozen MAIN backend config, NOT amplify_outputs.json.
// `npx ampx sandbox` regenerates amplify_outputs.json with the sandbox's own
// Cognito/identity pool IDs; reading from amplify_outputs.main.json keeps the
// app pinned to the MAIN pool (eu-west-2_j40RJRiTE) no matter what sandbox writes.
import outputs from "../amplify_outputs.main.json";

Amplify.configure({
  ...outputs,
  Auth: {
    Cognito: {
      userPoolId: "eu-west-2_j40RJRiTE",
      userPoolClientId: "4sub1i91s90n6l6h0pqujmtku1",
      identityPoolId: "eu-west-2:2f14dbff-e705-4e6f-ba69-e50b2eac372e",
    },
  },
});

console.log(Amplify.getConfig());