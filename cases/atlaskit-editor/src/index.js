// benchmark from parcel-benchmark
import React from "react";
import ReactDOM from "react-dom";
import { Editor } from "@atlaskit/editor-core";

ReactDOM.render(
	React.createElement(Editor, {
		placeholder: "editor",
		appearance: "comment",
		test: "Hello World",
	}),
	document.getElementById("react-root")
);
