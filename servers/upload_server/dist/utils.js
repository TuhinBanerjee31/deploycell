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
exports.uploadFile = exports.getAllFiles = exports.generate = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const aws_sdk_1 = require("aws-sdk");
require("dotenv/config");
const generate = () => {
    const subset = "123456789qwertyuiopasdfghjklzxcvbnm";
    const length = 5;
    let id = "";
    for (let i = 0; i < length; i++) {
        id += subset[Math.floor(Math.random() * subset.length)];
    }
    return id;
};
exports.generate = generate;
const getAllFiles = (folderPath) => {
    let response = [];
    const allFilesAndFolders = fs_1.default.readdirSync(folderPath);
    allFilesAndFolders.forEach((file) => {
        const fullFilePath = path_1.default.join(folderPath, file);
        if (fs_1.default.statSync(fullFilePath).isDirectory()) {
            response = response.concat(getAllFiles(fullFilePath));
        }
        else {
            response.push(fullFilePath);
        }
    });
    return response;
};
exports.getAllFiles = getAllFiles;
const s3 = new aws_sdk_1.S3({
    accessKeyId: process.env.R2_KEYID,
    secretAccessKey: process.env.R2_SECERT,
    endpoint: process.env.R2_ENDPOINT
});
const uploadFile = (fileName, localFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Normalize the file path to use forward slashes
        const normalizedKey = fileName.replace(/\\/g, "/");
        // Read the file content
        if (!fs_1.default.existsSync(localFilePath)) {
            throw new Error(`File not found at path: ${localFilePath}`);
        }
        const fileContent = fs_1.default.readFileSync(localFilePath);
        // Upload to S3
        const response = yield s3
            .upload({
            Body: fileContent,
            Bucket: "deploycell",
            Key: normalizedKey, // Use normalized key
        })
            .promise();
        console.log("File uploaded successfully:", response);
        return response;
    }
    catch (error) {
        console.error("Error uploading file:", error);
        throw error;
    }
});
exports.uploadFile = uploadFile;
