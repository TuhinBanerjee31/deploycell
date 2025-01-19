"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const aws_sdk_1 = require("aws-sdk");
const mime_types_1 = __importDefault(require("mime-types"));
const s3 = new aws_sdk_1.S3({
    accessKeyId: process.env.R2_KEYID,
    secretAccessKey: process.env.R2_SECERT,
    endpoint: process.env.R2_ENDPOINT,
    region: "auto",
    s3ForcePathStyle: true, // Required for R2 compatibility
});
const app = (0, express_1.default)();
app.get("/*", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const host = req.hostname;
        const id = host.split(".")[0];
        const filePath = req.path;
        const contents = yield s3.getObject({
            Bucket: "deploycell",
            Key: `dist/${id}${filePath}`
        }).promise();
        const type = mime_types_1.default.lookup(filePath) || "application/octet-stream";
        res.set("Content-Type", type);
        res.send(contents.Body);
    }
    catch (error) {
        console.error("Error fetching object from S3:", error.message);
        res.status(404).send("File not found");
    }
}));
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Listening on Port ${PORT}`));
