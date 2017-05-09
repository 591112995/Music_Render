import React from "react";
import "../style/header.less"
var Header = () => (
  <div id="fileWrapper" className="file_wrapper">
    <div id="info">
      HTML5 Audio API showcase | An Audio Viusalizer
    </div>
    <label htmlFor="uploadedFile">select a file to play:</label>
    <input type="file" id="uploadedFile"></input>
  </div>
)
export default Header
