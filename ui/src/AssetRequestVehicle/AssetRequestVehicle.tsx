import React from "react";
import "./AssetRequestVehicle.scss";
import axios, { AxiosResponse, AxiosError } from "axios";
import DatePicker from "react-datepicker";
import { Button } from "react-bootstrap";
import { contains, getValidDate, toPythonDate, makeid, toSentenceCase, dateToBackend } from "../functions";

interface SelectedVehicles {
  vehicleID: string;
  assetClass: string;
  startDateTime: Date;
  endDateTime: Date;
}

interface State {
  allow_getInitialData: boolean;
  allow_submitData: boolean;
  startDateTime: Date;
  endDateTime: Date;
  requestList: SelectedVehicles[];
}

export default class AssetRequestVehicle extends React.Component<any, State> {

  state: State = {
    allow_getInitialData: true,
    allow_submitData: true,
    startDateTime: getValidDate(new Date()),
    endDateTime: getValidDate(new Date()),
    requestList: [],
  };
  insert_assetType: React.RefObject<HTMLSelectElement>;

  constructor(props: any) {
    super(props);
    this.insert_assetType = React.createRef();
  }

  componentDidMount(): void {
    // console.clear();
    // Assign Current Time

    let t1: Date = getValidDate(new Date()),
      t2: Date = getValidDate(new Date());

    t1.setMinutes(t1.getMinutes() + 30);
    t1 = getValidDate(t1);
    t2.setMinutes(t2.getMinutes() + 60);
    t2 = getValidDate(t2);

    this.setState({ startDateTime: t1, endDateTime: t2 });
    this.getInitialData();
  }

  getInitialData(): void {
    if (!this.state.allow_getInitialData) return;
    this.setState({ allow_getInitialData: false });
    axios.request({
      url: "vehicle/request",
      method: "GET",
      params: { "requestID": this.props.match.params.id },
      timeout: 15000,
      // withCredentials: true,
      headers: { "X-Requested-With": "XMLHttpRequest" }
    }).then((res: AxiosResponse): void => {
      // console.log(res.data);
      if ((typeof res.data == "object") && (res.data["success"])) {
        window.open(window.location.origin + `/assetRequest/volunteers/${this.props.match.params.id}`, "_self", "", false);
      }
      this.setState({ allow_getInitialData: true });
    }).catch((err: AxiosError): void => {
      alert(err.message);
      this.setState({ allow_getInitialData: true });
    });
  }

  submitData(): void {




    if (!this.state.allow_getInitialData || !this.state.allow_submitData) return;
    console.clear();
    this.setState({ allow_submitData: false });
    const l: SelectedVehicles[] = this.state.requestList;

    let d: any = [];
    for (let x of l) {
      d.push({
        "vehicleID": x.vehicleID,
        "assetClass": x.assetClass,
        "startDateTime": toPythonDate(x.startDateTime), // toTimeblock()
        "endDateTime": toPythonDate(x.endDateTime)
      });
    }

    // Don't get recommendations for no assets requested
    if (!contains(d)) {
      this.setState({ allow_submitData: false });
      alert("At least one asset needs to be selected");
      return;
    }
    console.log({ "requestID": this.props.match.params.id, "vehicles": d });
    axios.request({
      url: "vehicle/request",
      method: "POST",
      data: { "requestID": this.props.match.params.id, "vehicles": d },
      timeout: 15000,
      // withCredentials: true,
      headers: { "X-Requested-With": "XMLHttpRequest" }
    }).then((res: AxiosResponse): void => {
      // console.log(res.data);
      // alert(res.data === 1 ? "Successfully Saved" : res.data);

      let requestData: any = [];
      for (const asset of this.state.requestList) {
        requestData.push({
          shiftID: asset.vehicleID,
          assetClass: asset.assetClass,
          startTime: dateToBackend(asset.startDateTime),
          endTime: dateToBackend(asset.endDateTime),
        });
      }

      axios.request({
        url: "recommendation",
        method: "POST",
        data: { "request": requestData },
        timeout: 15000,
        // withCredentials: true,
        headers: { "X-Requested-With": "XMLHttpRequest" }
      }).then((res: AxiosResponse): void => {
        let tmp = res.data["results"]
        console.log("res.data[results]:", tmp)

        axios.request({
          url: "shift/request?requestID=" + this.props.match.params.id,
          method: "POST",
          timeout: 15000,
          data: { "shifts": tmp },
          // withCredentials: true,
          headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then((res: AxiosResponse): void => {
          console.log(res.data)
          if (res.data.success) {
            // alert("Save Succeded")
            this.setState({ allow_submitData: true });
            window.open(window.location.origin + `/assetRequest/volunteers/${this.props.match.params.id}`, "_self", "", false);
          } else {
            this.setState({ allow_submitData: true });
            alert("Save Failed")
          }
        }).catch((err: AxiosError): void => {
          alert(err.message);
          this.setState({ allow_submitData: true });
        });
      }).catch((err: AxiosError): void => {
        alert(err.message);
        this.setState({ allow_submitData: true });
      });

      //this.props.submitRequest(this.state.requestList);      
    }).catch((err: AxiosError): void => {
      alert(err.message);
      this.setState({ allow_submitData: true });
    });




  }

  insertAsset(): void {
    // Get Data
    console.clear();
    if (!this.state.allow_getInitialData) return;
    const o: SelectedVehicles[] = this.state.requestList;
    let a: SelectedVehicles = {
      vehicleID: makeid(),
      assetClass: this.insert_assetType.current ? this.insert_assetType.current.value : "",
      startDateTime: this.state.startDateTime,
      endDateTime: this.state.endDateTime,
    };
    console.log(a.vehicleID);

    // Validate Data :- Asset Type
    if (!contains(a.assetClass)) { alert("Asset Type has not been selected"); return; }

    // Validate Data :- Start and End DateTime
    if (!contains(a.startDateTime)) { alert("Start DateTime has not been selected"); return; }
    else if (!contains(a.endDateTime)) { alert("End DateTime has not been selected"); return; }
    else if (a.startDateTime.valueOf() < (new Date()).valueOf()) { alert("Start DateTime has to be in the future"); return; }
    else if (a.startDateTime.valueOf() >= a.endDateTime.valueOf()) { alert("Start DateTime has to be earlier than End DateTime"); return; }
    else if ((Math.abs(a.startDateTime.valueOf() - a.endDateTime.valueOf()) / 3600000) > 14) { alert("This request exceeds the maximum shift length, consider breaking down into multiple shifts"); }



    // Detect same records --> for (let x of o) if (JSON.stringify(a) === JSON.stringify(x)) { alert("Same Record already exists"); return; }

    // Validated Successfully
    o.push(a);
    this.setState({ requestList: o });
  }

  removeAsset(i: string): void {
    console.clear();
    const o: SelectedVehicles[] = this.state.requestList;

    // Find and Remove Element
    for (let y = 0; y < o.length; y++) if (o[y].vehicleID === i) o.splice(y, 1);

    // Update Data
    this.setState({ requestList: o });
  }

  setDateTime(v: Date, t: ("start" | "end")): void {
    console.clear();

    // Get & Check Value
    if (!contains(v)) return;

    // Modify Value
    v = getValidDate(v);

    // Set Value
    if (t === "start") this.setState({ startDateTime: v });
    else if (t === "end") this.setState({ endDateTime: v });
  }

  render() {
    return (
      <asset-request-vehicle>
        <h4>New Asset Request</h4>
        <hr />
        <div className="entry">
          <div className="con">
            <label>Asset Type</label>
            <select ref={this.insert_assetType}>
              <option value="" disabled hidden>Select asset type</option>
              <option value="heavyTanker" selected>Heavy Tanker</option>
              <option value="mediumTanker">Medium Tanker</option>
              <option value="lightUnit">Light Unit</option>
            </select>
          </div>
          <div className="con">
            <label>Start Time Date</label>
            <DatePicker
              selected={this.state.startDateTime}
              onChange={(i: Date): void => { this.setDateTime(i, "start"); }}
              showTimeSelect
              timeIntervals={30}
              timeCaption="Time"
              dateFormat="d MMMM yyyy h:mm aa" />
          </div>
          <div className="con">
            <label>End Time Date</label>
            <DatePicker
              selected={this.state.endDateTime}
              onChange={(i: Date): void => { this.setDateTime(i, "end"); }}
              showTimeSelect
              timeIntervals={30}
              timeCaption="Time"
              dateFormat="d MMMM yyyy h:mm aa" />
          </div>
          <insert onClick={() => this.insertAsset()}></insert>
        </div>
        <hr className="thick" />
        <div className="output">
          {this.state.allow_getInitialData ? <>
            {this.state.requestList.map((t: SelectedVehicles) => (
              <request-body id={t.vehicleID}>
                <svg type="close" viewBox="0 0 282 282" onClick={() => this.removeAsset(t.vehicleID)}> <g> <circle cx="141" cy="141" r="141" /> <ellipse cx="114" cy="114.5" rx="114" ry="114.5" /> <path d="M1536.374,2960.632,1582.005,2915l20.742,20.742-45.632,45.632,45.632,45.632-20.742,20.742-45.632-45.632-45.632,45.632L1470,3027.005l45.632-45.632L1470,2935.742,1490.742,2915Z" /> </g> </svg>
                <h2>{toSentenceCase(t.assetClass)}</h2>
                <div className="cont-1">
                  <div className="cont-2">
                    <label>Start</label>
                    <br />
                    <div className="cont-3">{t.startDateTime.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                    <div className="cont-3">{t.startDateTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", hour12: true })}</div>
                  </div>
                  <div className="cont-2">
                    <label>End</label>
                    <br />
                    <div className="cont-3">{t.endDateTime.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                    <div className="cont-3">{t.endDateTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", hour12: true })}</div>
                  </div>
                </div>
              </request-body>
            ))}
          </> : "Loading"}
        </div>
        <hr className="thick" />
        <Button className="type-1" onClick={() => this.submitData()}>{this.state.allow_submitData ? "Submit Request" : "Loading"}</Button>
      </asset-request-vehicle>
    );
  }
}