import {useSearchParams} from "react-router-dom";
import {useEffect} from "react";
import {AUTH_API_URL} from "../App";
import {getToken} from "./AuthHelper";

export default function LoginSuccess(){
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
        let code = searchParams.get("code");
        setSearchParams({});
        if (code) {
            fetch(AUTH_API_URL, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "user-agent": "cloudflare-worker-ai-tutor-login",
                    accept: "application/json",
                },
                body: JSON.stringify({code})
            })
            .then(response => response.json())
                .then(result => {
                    if (result.token) {
                        console.log("Finished logging in. Token: " + result.token);
                        localStorage.setItem("token", result.token);
                        window.location.href = "/auth/login";
                    } else {
                        console.error(result);
                    }

                })
                .catch(error => {
                    console.error(error);
                });
        }
    }, []);

    
    if (getToken()) {
        return (
            <div>
                <h1>Logging in...</h1>
            </div>
        )
    } else {
        return (
            <div>
                <h1>Something went wrong logging in (no code was sent)</h1>
            </div>
        )
    }
}