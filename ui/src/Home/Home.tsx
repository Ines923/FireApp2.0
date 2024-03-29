import React from "react";
import "./Home.scss";
import axios, { AxiosResponse, AxiosError } from "axios";


export default class Home extends React.Component<any, any> {

    captain(): void {
        window.open(window.location.origin + `/captain`, "_self", "", false)
    }

    volunteer(): void {
        window.open(window.location.origin + `/volunteer`, "_self", "", false)
    }

    test() {

        const info = {
            idVolunteer: "4fdIPciwWUvj2Fn",
            idVehicle: "LXmy1Q9cVQpVgNg",
            //status: "confirmed"
        }

        axios.request({
            url: "volunteer/status",
            method: "GET",//"PATCH",
            timeout: 15000,
            params: info,
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then((res: AxiosResponse): void => {
            let tmp = res.data
            console.log(tmp);
        }).catch((err: AxiosError): void => {
            alert(err.message);
        });

    }


    render() {
        return (
            <div className="padding">
                <button className="type-1 margin" onClick={() => this.captain()}>I am a Brigade Captain</button>
                <button className="type-1 margin" onClick={() => this.volunteer()}>I am a Volunteer</button>
                {/* <button onClick={() => this.test()}>test</button> */}
            </div>
        );
    }
}