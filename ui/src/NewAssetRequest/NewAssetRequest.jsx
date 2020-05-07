import React, { Component } from "react";
import "./NewAssetRequest.scss";
import { contains } from "../main.js";
import Request from "./components/Request";

import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";              // -> PACKAGE FROM : npm i --save react-datepicker

// https://xd.adobe.com/view/2856aec3-f800-48bc-5922-bdfc629bf833-5e67/?fullscreen
class NewAssetRequest extends Component {
  state = {
    startDateTime: null,
    endDateTime: null,
    requestList: [
      // { id:1,assetType:"Heavy Tanker",startDateTime:new Date("2020-04-28T17:50"),endDateTime:new Date("2020-05-01T14:50") }
    ],
    // Dummy list used to test recommendation UI without running the backend 
    volunteer_list: [
      {
        asset_id: 1,
        asset_class: "Medium Unit",
        volunteers: [
          {
            volunteer_id: 5123,
            position_id: 1,
            volunteer_name: "Joe Blob",
            role: "Driver",
            qualifications: [
              "heavy rigid license",
              "pump training",
              "crew leader training",
              "advanced training",
            ],
            contact_info: [{ detail: "0412 490 340" }],
          },
          {
            volunteer_id: 649,
            position_id: 2,
            volunteer_name: "Jane Doe",
            role: "Advanced",
            qualifications: ["advanced training", "crew leader training"],
            contact_info: [{ detail: "0412 490 340" }],
          },
        ],
      },
      {
        asset_id: 2,
        asset_class: "Light Unit",
        volunteers: [
          {
            volunteer_id: 5123,
            position_id: 1,
            volunteer_name: "Mary Blank",
            role: "Driver",
            qualifications: [
              "heavy rigid license",
              "pump training",
              "crew leader training",
              "advanced training",
            ],
            contact_info: [{ detail: "0412 490 340" }],
          },
          {
            volunteer_id: 649,
            position_id: 2,
            volunteer_name: "John Connor",
            role: "Advanced",
            qualifications: ["advanced training", "crew leader training"],
            contact_info: [{ detail: "0412 490 340" }],
          },
        ],
      },
    ],
  };

  constructor(props) {
    super(props);
    this.insert_assetType = React.createRef();
  }

  processAssetRequest = () => {
    console.clear();
    /* This function needs to: 
            1. Pass the request list to the assetRequestContainer via this.state.updateRequestList
            2. convert this.state.requestList into the list that will be posted and expected by the backend [{id/type/timeblock/timeblock}] 
            3. pass that list to the backend
            4. receive the recommendation list from the backend 
            5. Pass the recommendation list to the assetRequestContainer via onDisplayRequest(list)
            */

    // 1.
    const requestList = this.state.requestList;
    this.props.updateVehicleTimes(requestList);

    // 2.
    let postData = [];                                      // [ { assetId: int, assetClass: String, startTime: int, endTime: int } ]
    for (let x of requestList) {
      postData.push({
        "asset_id": x.id,
        "asset_name": x.assetType,
        "start_time": this.toTimeblock(x.startDateTime),
        "end_time": this.toTimeblock(x.endDateTime)
      });
    }

    // Don't get recommendations for no assets requested
    if (postData.length === 0) {
      alert("At least one asset needs to be selected");
      return false;
    }

    // 3. TODO
    postData = { "asset_list": postData }

    const axios = require('axios');
    axios.post('http://localhost:5000/recommendation', postData)

      // 4. response.data.volunteer_list
      // 5.
      .then(response => this.props.onDisplayRequest(response.data.volunteer_list))
      .catch(function (error) {
        // handle error
        console.log(error);
      })
  };

  dummyProcessAssetRequest = () => {
    console.clear();
    /* A dummy function to display the recommendation screen using dummy data, so we can test without running the backend */
    // 1.
    const requestList = this.state.requestList;
    this.props.updateVehicleTimes(requestList);
    // 2.
    // 3.
    // 4.
    let list = this.state.volunteer_list;                   //should be the list returned by the backend, using dummy list for now
    // 5.
    this.props.onDisplayRequest(list);
  };


  toTimeblock = (d) => {
    if (!contains(d) || d === "Invalid Date") return 0;
    return d.getDay() * 48 + d.getHours() * 2 + (d.getMinutes() === 0 ? 0 : 1);
  };

  insertAsset = () => {
    // Get Data
    console.clear();
    const o = this.state.requestList;
    let a = {
      id: o.length + 1,
      assetType: this.insert_assetType.current.value,
      startDateTime: new Date(this.state.startDateTime),
      endDateTime: new Date(this.state.endDateTime),
    };

    // Validate Data
    for (let x in a)
      if (!contains(a[x]) || a[x] === "Invalid Date") {
        alert(x + " not entered");
        return;
      }

    // Detect same records --> for (let x of o) if (JSON.stringify(a) === JSON.stringify(x)) { alert("Same Record already exists"); return; }

    // Check Start and End DateTime Range
    if (a.startDateTime.valueOf() < (new Date()).valueOf()) { alert("Start DateTime has to be in the future"); return; }
    if (a.startDateTime.valueOf() >= a.endDateTime.valueOf()) { alert("Start DateTime has to be earlier than End DateTime"); return; }

    // Validated Successfully
    o.push(a);
    this.setState({ requestList: o });
  };

  removeAsset = (i) => {
    console.clear();
    const o = this.state.requestList;

    // Find and Remove Element, then update id
    for (let y = 0; y < o.length; y++) {
      if (o[y].id === i) {
        o.splice(y, 1);
        // Update id
        for (let x = 0; x < o.length; x++) o[x].id = x + 1;
        break;
      }
    }

    // Update Data
    this.setState({ requestList: o });
  };

  componentDidMount = () => {
    console.clear();
    // Assign Current Time
    let t1 = new Date(),
        t2 = new Date();
    t1.setSeconds(0);
    t2.setSeconds(0);
    t1.setMinutes(t1.getMinutes() + 30);
    t1.setMinutes(t1.getMinutes() >= 30 ? 30 : 0);
    t2.setMinutes(t2.getMinutes() + 60);
    t2.setMinutes(t2.getMinutes() >= 30 ? 30 : 0);

    this.setState({ startDateTime: t1, endDateTime: t2 });
  };

  setDateTime = (v, t) => {
    console.clear();
    v = new Date(v);

    // Get & Check Value
    if (!contains(v) || v == "Invalid Date") return;

    // Modify Value
    v.setSeconds(0);
    v.setMinutes(v.getMinutes() >= 30 ? 30 : 0);
    
    // Set Value
    if (t === "start") this.setState({ startDateTime: v });
    else if (t === "end") this.setState({ endDateTime: v });
  };

  render() {
    return (
      <main-body>
        <h4 className="mt-2">New Asset Request</h4>
        <hr />
        <container>
          <entry>
            <div className="con">
              <label>Asset Type</label>
              <select ref={this.insert_assetType}>
                <option value="" disabled hidden>Select asset type</option>
                <option selected>Heavy Tanker</option>
                <option>Light Unit</option>
              </select>
            </div>
            <div className="con">
              <label>Start Time Date</label>
              <DatePicker
                selected={this.state.startDateTime}
                onChange={ (i) => { this.setDateTime(i, "start"); }}
                showTimeSelect
                timeIntervals={30}
                timeCaption="Time"
                dateFormat="d MMMM yyyy h:mm aa" />
            </div>
            <div className="con">
              <label>End Time Date</label>
              <DatePicker
                selected={this.state.endDateTime}
                onChange={ (i) => { this.setDateTime(i, "end"); }}
                showTimeSelect
                timeIntervals={30}
                timeCaption="Time"
                dateFormat="d MMMM yyyy h:mm aa" />
            </div>
            <insert onClick={this.insertAsset}></insert>
          </entry>
          <hr></hr>
          <output>
            {this.state.requestList.map((t) => (
              <Request
                id={t.id}
                assetType={t.assetType}
                startDateTime={t.startDateTime}
                endDateTime={t.endDateTime}
                removeAsset={this.removeAsset}
              />
            ))}
          </output>
          <hr></hr>
          <button
            className="type-1"
            onClick={() => this.processAssetRequest()}
          >
            Submit Request
          </button>
          {/* BELOW IS A TESTING BUTTON */}
          <button onClick={() => this.dummyProcessAssetRequest()}>Go to recommendation screen with dummy data</button>
        </container>
      </main-body>
    );
  }
}
export default NewAssetRequest;
