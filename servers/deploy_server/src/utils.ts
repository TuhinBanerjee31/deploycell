import { S3 } from "aws-sdk";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import "dotenv/config";

//Setting up cloud-flare S3 buckect connection
const s3 = new S3({
  accessKeyId: process.env.R2_KEYID,
  secretAccessKey: process.env.R2_SECERT,
  endpoint: process.env.R2_ENDPOINT,
  region: "auto",
  s3ForcePathStyle: true,
});

//Download all the codebase files from object store
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

//Creates production build file
async function buildProject(id: string) {
  const projectPath = path.join(__dirname, `output/${id}`);
  const packageJsonPath = path.join(projectPath, "package.json");

  if (fs.existsSync(packageJsonPath)) {
    console.log(`Building project: ${id}`);
    return new Promise((resolve, reject) => {
      const child = exec(
        `cd ${projectPath} && npm install && npm run build`
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
  } else {
    console.log(`No build required for project: ${id} (plain HTML/CSS/JS files).`);
  }
}

//Get now the dist paths from output folder and sets and uploads over the object-store
async function copyFinalDist(id: string) {
  const projectPath = path.join(__dirname, `output/${id}`);
  const distPath = fs.existsSync(path.join(projectPath, "dist"))
    ? path.join(projectPath, "dist")
    : projectPath; // Use root folder if no "dist" exists

  if (!fs.existsSync(distPath)) {
    console.error(`Folder not found: ${distPath}`);
    return;
  }

  const allFiles = getAllFiles(distPath);
  const uploadPromises = allFiles.map((file) =>
    uploadFile(`dist/${id}/` + file.slice(distPath.length + 1), file)
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

export { downloadS3Folder, buildProject, copyFinalDist };
