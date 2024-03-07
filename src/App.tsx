import React from 'react';
import './App.css';
import { useState } from 'react';
import {Marked, Token, Tokens} from "marked";
import hljs from 'highlight.js/lib/common';
import { markedHighlight } from "marked-highlight";
import javascript from 'highlight.js/lib/languages/javascript';
import 'highlight.js/styles/atom-one-light.min.css';
import DOMPurify, {sanitize} from "dompurify";

const marked = new Marked(
    markedHighlight({
        async: false,
        langPrefix: 'hljs language-',
        highlight: (code, lang, callback) => {
            console.log("highlighting", code, lang);
            let highlighted = hljs.highlight(code, {language: lang});
            return highlighted.value;
        }
    })
);


function Header() {
    return (
        <h1 className = "App-header">Header</h1>
    )
}



function Problem({id}: { id: string }) {
    const [problemData, setProblemData] = useState({
        title: 'Loading...',
        description: 'test description',
        tests: ["test1", "test2", "test3"],
        testExpectedResults: ["1, 2, 3"],
        hiddenTests: ["hidden test1", "hidden test2", "hidden test3:"],
        hiddenTestExpectedResults: ["1, 2, 3"],
        displayAbove: 'testing display above',
        displayBelow: 'testing display below',
        solution: 'solution goes here',
        solutionExplanation: 'solution explination goes here',
        codeLang: 'javascript'
    });

    if (problemData.title === 'Loading...' && id) {
        fetch(id)
            .then(async r => {
                let text = await r.text()
                if (!r.ok || !text.startsWith("#")) {
                    throw new Error("Failed to fetch problem data");
                } else {
                    return text;
                }
            })
            .then(async text => {
                let tokens = marked.lexer(text);
                console.log(tokens);

                let title = (tokens.shift() as Tokens.Heading).text;

                // Collect everything under the description heading
                removeNextHeading(tokens); // Remove the description heading

                let description = "";
                while (tokens.length > 0 && tokens[0].type !== "heading") {
                    description += ((tokens.shift() as Token).raw);
                }

                removeNextHeading(tokens); // Remove the problem heading
                let problem = tokens.shift() as Tokens.Code;
                let splitProblem = problem.text.split("// Your code here");
                console.log(splitProblem);
                let codeLang = problem.lang ? problem.lang : "javascript";

                let displayAbove = splitProblem[0].trim();
                let displayBelow = splitProblem[1].trim();

                removeNextHeading(tokens); // Remove the solution heading
                let solutionMd = tokens.shift() as Tokens.Code;
                console.log(solutionMd);
                if (solutionMd.lang !== codeLang) {
                    throw new Error("Solution language does not match problem language " + solutionMd.lang + " " + codeLang);
                }
                let solution = solutionMd.text;

                // The remaining parts under the solution heading is the explination
                let solutionExplanation = "";
                while (tokens.length > 0 && tokens[0].type !== "heading") {
                    solutionExplanation += ((tokens.shift() as Token).raw);
                }


                removeNextHeading(tokens); // Remove the tests heading
                // Tests are formatted as a list of functions in a code block with the expected result below it
                let tests: string[] = [];
                let testExpectedResults: string[] = [];

                while (tokens.length > 1 && tokens[0].type === "code" && tokens[1].type === "paragraph") {
                    let test = tokens.shift() as Tokens.Code;
                    let expectedResult = tokens.shift() as Tokens.Paragraph;
                    tests.push(test.text);
                    testExpectedResults.push(expectedResult.text);
                }

                removeNextHeading(tokens); // Remove the hidden tests heading
                // Hidden tests are formatted the same as normal tests
                let hiddenTests: string[] = [];
                let hiddenTestExpectedResults: string[] = [];

                while (tokens.length > 1 && tokens[0].type === "code" && tokens[1].type === "paragraph") {
                    let test = tokens.shift() as Tokens.Code;
                    let expectedResult = tokens.shift() as Tokens.Paragraph;
                    hiddenTests.push(test.text);
                    hiddenTestExpectedResults.push(expectedResult.text);
                }

                setProblemData({
                    title,
                    description,
                    tests,
                    testExpectedResults,
                    hiddenTests,
                    hiddenTestExpectedResults,
                    displayAbove,
                    displayBelow,
                    solution,
                    solutionExplanation,
                    codeLang
                });
            })
            .catch(e => {
                console.error(e);
                problemData.title = 'Failed to load problem data'
                setProblemData(problemData);
            })
    }

    let descParsed = DOMPurify.sanitize(marked.parse(problemData.description) as string);
    let displayAboveParsed = DOMPurify.sanitize(hljs.highlight(problemData.codeLang, problemData.displayAbove).value);
    let displayBelowParsed = DOMPurify.sanitize(hljs.highlight(problemData.codeLang, problemData.displayBelow).value);
    let solutionParsed = DOMPurify.sanitize(hljs.highlight(problemData.codeLang, problemData.solution).value);
    let solutionExplanationParsed = DOMPurify.sanitize(marked.parse(problemData.solutionExplanation) as string);

    let testsDisplay = [];
    for (let i = 0; i < problemData.tests.length; i++) {
        testsDisplay.push(
            "Test " + (i + 1) + ": "+ problemData.tests[i] + " -> " + problemData.testExpectedResults[i]
        );
    }

    let hiddenTestsDisplay = [];
    for (let i = 0; i < problemData.hiddenTests.length; i++) {
        hiddenTestsDisplay.push(
            "Hidden Test " + (i + 1) + ": "+ problemData.hiddenTests[i] + " -> " + problemData.hiddenTestExpectedResults[i]
        );
    }

    return (
        <div className="Problem">
            <h2 className="Problem-title">{problemData.title}</h2>
            <div className="Problem-desc" dangerouslySetInnerHTML={{__html: descParsed}}/>
            <div className="Problem-Code">
                <pre className="Problem-template-code" dangerouslySetInnerHTML={{__html: displayAboveParsed}}/>
                <input className="Problem-user-code"/>
                <pre className="Problem-template-code" dangerouslySetInnerHTML={{__html: displayBelowParsed}}/>
            </div>
            <h3>Solution</h3>
            <pre className="Problem-solution" dangerouslySetInnerHTML={{__html: solutionParsed}} />
            <div className="Problem-solution-explanation" dangerouslySetInnerHTML={{__html: solutionExplanationParsed}}/>
            <h3>Tests</h3>
            <ul>
                {testsDisplay.map((test, i) => <li key={i}>{test}</li>)}
            </ul>
            <h3>Hidden Tests</h3>
            <ul>
                {hiddenTestsDisplay.map((test, i) => <li key={i}>{test}</li>)}
            </ul>
        </div>
    );
}

function removeNextHeading(tokens: Token[]) {
    removeNextType(tokens, "heading");
}

function removeNextType(tokens: Token[], type: string) {
    while (tokens.length > 0 && tokens[0].type !== type) {
        tokens.shift();
    }
    tokens.shift();

}

function App() {
  return (
    <div className="App">
      <Header />
      <Problem id={window.location.href + ".md"} />
    </div>
  );
}

export default App;
