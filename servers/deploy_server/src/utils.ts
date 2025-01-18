import { S3 } from "aws-sdk";
import {exec, spawn} from "child_process";
import fs from "fs";
import path from "path";
import "dotenv/config";

const s3 = new S3({
  accessKeyId: process.env.R2_KEYID,
  secretAccessKey: process.env.R2_SECERT,
  endpoint: process.env.R2_ENDPOINT,
});

async function downloadS3Folder(prefix: string) {
  try {
    const allFiles = await s3
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
      return new Promise<void>(async (resolve, reject) => {
        try {
          if (!Key) {
            resolve();
            return;
          }

          const finalOutputPath = path.join(__dirname, Key.replace(/\//g, path.sep));
          const dirName = path.dirname(finalOutputPath);

          if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
          }

          const outputFile = fs.createWriteStream(finalOutputPath);
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
        } catch (error) {
          console.error(`Error processing ${Key}:`, error);
          reject(error);
        }
      });
    });

    console.log("Downloading files...");
    await Promise.all(downloadPromises);
    console.log("All files downloaded successfully.");
  } catch (error) {
    console.error("Error downloading S3 folder:", error);
    throw error;
  }
}

function buildProject(id: string) {
  return new Promise((resolve, reject) => {
    const child = exec(
      `cd ${path.join(__dirname, `output/${id}`)} && npm install && npm run build`
    );

    child.stdout?.on("data", (data) => {
      console.log("stdout: " + data);
    });

    child.stderr?.on("data", (data) => {
      console.error("stderr: " + data);
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`Build completed for project: ${id}`);
        resolve(true);
      } else {
        reject(new Error(`Build failed for project: ${id} with exit code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start build process: ${err.message}`));
    });
  });
}

async function copyFinalDist(id: string) {
  const folderPath = path.join(__dirname, `output/${id}/dist`);
  if (!fs.existsSync(folderPath)) {
    console.error(`Folder not found: ${folderPath}`);
    return;
  }
  const allFiles = getAllFiles(folderPath);
  const uploadPromises = allFiles.map((file) =>
    uploadFile(`dist/${id}/` + file.slice(folderPath.length + 1), file)
  );
  await Promise.all(uploadPromises);
  console.log("All files uploaded successfully.");
}

const getAllFiles = (folderPath: string): string[] => {
  if (!fs.existsSync(folderPath)) {
    console.error(`Directory not found: ${folderPath}`);
    return [];
  }
  let response: string[] = [];
  const allFilesAndFolders = fs.readdirSync(folderPath);
  allFilesAndFolders.forEach((file) => {
    const fullFilePath = path.join(folderPath, file);
    if (fs.statSync(fullFilePath).isDirectory()) {
      response = response.concat(getAllFiles(fullFilePath));
    } else {
      response.push(fullFilePath);
    }
  });
  return response;
};

const uploadFile = async (fileName: string, localFilePath: string) => {
  const normalizedKey = fileName.replace(/\\/g, "/");
  const fileContent = fs.readFileSync(localFilePath);
  const response = await s3
    .upload({
      Body: fileContent,
      Bucket: "deploycell",
      Key: normalizedKey,
    })
    .promise();
  console.log(`Uploaded: ${normalizedKey}`, response);
};

export {downloadS3Folder, buildProject, copyFinalDist};