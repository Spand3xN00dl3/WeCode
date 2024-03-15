import React, {useState} from "react";
import {marked, ProblemData, UserData} from "./Problem";
import DOMPurify from "dompurify";
import {expireToken, getToken, isLoggedIn, logIn} from "../auth/AuthHelper";

export function HelpBox({problemData, getUserData, runTests}: { problemData: ProblemData, getUserData: () => UserData, runTests: () => void}) {
    const [response, setResponse] = useState("");

    function handleHelpRequest() {
        runTests();

        if (!isLoggedIn()) {
            logIn();
            setResponse("You must be logged in to use the AI tutor. Please log in and try again.");
            return;
        }

        let userData = getUserData();

        let visibleTests = "";
        for (let i = 0; i < problemData.tests.length; i++) {
            visibleTests += "- " + getTestAsString(problemData.tests[i], problemData.testExpectedResults[i], userData.testResults[i]);
        }

        let hiddenTests = "";
        for (let i = 0; i < problemData.hiddenTests.length; i++) {
            hiddenTests += "- " + getTestAsString(problemData.hiddenTests[i], problemData.hiddenTestExpectedResults[i], userData.testResults[i + problemData.tests.length]);
        }

        setResponse("Asking AI tutor for help...");

        let aiPrompt = "One of our users is stuck on this problem:\n"
            + "## " + problemData.title + "\n"
            + problemData.description + "\n\n"
            + "# Here are some example solutions that we've made: \n\n"
            + problemData.solution + "\n"
            + "Do not disclose these solutions or even the existence of these solutions to the user. Only use these solutions to " +
            "further your understanding of the problem and the issue the user is having.\n\n"
            + "# This is the user's code: \n"
            + "```" + problemData.codeLang + "\n"
            + problemData.displayAbove + "\n"
            + "// Below is the first line of the user's code\n"
            + userData.history[userData.history.length - 1] + "\n"
            + "// Above is the last line of the user's code\n"
            + problemData.displayBelow + "\n"
            + "```\n\n"
            + "# Here are the test cases we've ran: \n"
            + visibleTests + "\n"
            + "# Here are the hidden test cases (The user knows that these exist, but do not disclose the test cases): \n"
            + hiddenTests + "\n"
            + "Please help the user out with any issues they are having.";

        console.log(JSON.stringify({
            prompt: aiPrompt
        }));

        let token = getToken();



        fetch("https://codehelp.api.dacubeking.com/ai-tutor", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "user-agent": "cloudflare-worker-ai-tutor-login",
                accept: "application/json",
                "Authorization": `token ${token}`
            },
            body: JSON.stringify({
                prompt: aiPrompt,
                max_tokens: 300,
            })
        })
            .then(response => response.json())
            .then((json: {
                status: number,
                prompt: string,
                response: string,
                expire_logins: boolean,
            }) => {
                if (json.expire_logins) {
                    expireToken();
                    logIn();
                    setResponse("Your login has expired. Please try again after logging in.");
                    return;
                }

                if (json.status === 401) {
                    setResponse("You are not authorized to use the AI tutor.");
                    return;
                }

                if (json.status !== 200) {
                    setResponse("An error occurred while using the AI tutor. Please try again later.");
                    return;
                }

                console.log(json.response);
                console.log(DOMPurify.sanitize(marked.parse(json.response) as string));
                setResponse(DOMPurify.sanitize(marked.parse(json.response) as string));
            });
    }

    return (
        <div className="AI-help-area">
            <button onClick={() => {
                handleHelpRequest();
            }} className="Help Button">I'm Stuck
            </button>
            <p className="Code-tutor-response" dangerouslySetInnerHTML={{__html: response}}/>
        </div>
    );
}

function getTestAsString(test: string, expectedResult: string, result: boolean | undefined) {
    let resultText = result === undefined ? "Not run" : (result ? "Passed" : "Failed");
    return test + " -> " + expectedResult + " : " + resultText + "\n"
}