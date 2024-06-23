import { useState } from "react";
import "./validate.scss";
import apiRequest from "../../lib/apiRequest";

function Validate() {
  const [hashKey, setHashKey] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [err, setErr] = useState("");

  const handleHashKeyChange = (event) => {
    setHashKey(event.target.value);
  };

  const handleValidate = async () => {
    try {
      console.log(hashKey);
      const res = await apiRequest.post("/generate/verifyCertificate", {
        hashKey,
      });

      setIsValid(true);
    } catch (error) {
      setErr("Certificate is not valid");
    }
  };

  return (
    <div className="container">
      <div className="validate">
        <h1>Certificate Validator</h1>
        <input
          type="text"
          value={hashKey}
          onChange={handleHashKeyChange}
          placeholder="Enter hash key"
        />
        <button onClick={handleValidate}>Validate</button>
        {isValid ? <p>Certificate is valid!</p> : <p>{err}</p>}
      </div>
      <div className="sideContainer"></div>
    </div>
  );
}

export default Validate;
