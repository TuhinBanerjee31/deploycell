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
exports.copyFinalDist = exports.buildProject = exports.downloadS3Folder = void 0;
const aws_sdk_1 = require("aws-sdk");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
require("dotenv/config");
const s3 = new aws_sdk_1.S3({
    accessKeyId: process.env.R2_KEYID,
    secretAccessKey: process.env.R2_SECERT,
    endpoint: process.env.R2_ENDPOINT,
    region: "auto",
    s3ForcePathStyle: true,
});
function downloadS3Folder(prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const allFiles = yield s3
                .listObjectsV2({
                Bucket: "deploycell",
                Prefix: prefix,
            })
                .promise();
            if (!allFiles.Contents || allFiles.Contents.length === 0) {
                console.log(`No files found with prefix: ${prefix}`);
                return;
            }
            const downloadPromises = allFiles.Contents.map(({ Key }) => {
                return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (!Key) {
                            resolve();
                            return;
                        }
                        const finalOutputPath = path_1.default.join(__dirname, Key.replace(/\//g, path_1.default.sep));
                        const dirName = path_1.default.dirname(finalOutputPath);
                        if (!fs_1.default.existsSync(dirName)) {
                            fs_1.default.mkdirSync(dirName, { recursive: true });
                        }
                        const outputFile = fs_1.default.createWriteStream(finalOutputPath);
                        s3.getObject({ Bucket: "deploycell", Key })
                            .createReadStream()
                            .pipe(outputFile)
                            .on("finish", () => {
                            console.log(`Downloaded: ${Key}`);
                            resolve();
                        })
                            .on("error", (err) => {
                            console.error(`Error downloading ${Key}:`, err);
                            reject(err);
                        });
                    }
                    catch (error) {
                        console.error(`Error processing ${Key}:`, error);
                        reject(error);
                    }
                }));
            });
            console.log("Downloading files...");
            yield Promise.all(downloadPromises);
            console.log("All files downloaded successfully.");
        }
        catch (error) {
            console.error("Error downloading S3 folder:", error);
            throw error;
        }
    });
}
exports.downloadS3Folder = downloadS3Folder;
function buildProject(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const projectPath = path_1.default.join(__dirname, `output/${id}`);
        const packageJsonPath = path_1.default.join(projectPath, "package.json");
        if (fs_1.default.existsSync(packageJsonPath)) {
            console.log(`Building project: ${id}`);
            return new Promise((resolve, reject) => {
                var _a, _b;
                const child = (0, child_process_1.exec)(`cd ${projectPath} && npm install && npm run build`);
                (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on("data", (data) => {
                    console.log("stdout: " + data);
                });
                (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on("data", (data) => {
                    console.error("stderr: " + data);
                });
                child.on("close", (code) => {
                    if (code === 0) {
                        console.log(`Build completed for project: ${id}`);
                        resolve(true);
                    }
                    else {
                        reject(new Error(`Build failed for project: ${id} with exit code ${code}`));
                    }
                });
                child.on("error", (err) => {
                    reject(new Error(`Failed to start build process: ${err.message}`));
                });
            });
        }
        else {
            console.log(`No build required for project: ${id} (plain HTML/CSS/JS files).`);
        }
    });
}
exports.buildProject = buildProject;
function copyFinalDist(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const projectPath = path_1.default.join(__dirname, `output/${id}`);
        const distPath = fs_1.default.existsSync(path_1.default.join(projectPath, "dist"))
            ? path_1.default.join(projectPath, "dist")
            : projectPath; // Use root folder if no "dist" exists
        if (!fs_1.default.existsSync(distPath)) {
            console.error(`Folder not found: ${distPath}`);
            return;
        }
        const allFiles = getAllFiles(distPath);
        const uploadPromises = allFiles.map((file) => uploadFile(`dist/${id}/` + file.slice(distPath.length + 1), file));
        yield Promise.all(uploadPromises);
        console.log("All files uploaded successfully.");
    });
}
exports.copyFinalDist = copyFinalDist;
const getAllFiles = (folderPath) => {
    if (!fs_1.default.existsSync(folderPath)) {
        console.error(`Directory not found: ${folderPath}`);
        return [];
    }
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
const uploadFile = (fileName, localFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    const normalizedKey = fileName.replace(/\\/g, "/");
    const fileContent = fs_1.default.readFileSync(localFilePath);
    const response = yield s3
        .upload({
        Body: fileContent,
        Bucket: "deploycell",
        Key: normalizedKey,
    })
        .promise();
    console.log(`Uploaded: ${normalizedKey}`, response);
});
