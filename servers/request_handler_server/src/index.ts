import 'dotenv/config'
import express from "express";
import { S3 } from "aws-sdk";
import mime from "mime-types";

const s3 = new S3({
    accessKeyId: process.env.R2_KEYID,
    secretAccessKey: process.env.R2_SECERT,
    endpoint: process.env.R2_ENDPOINT,
    region: "auto", // R2 uses "auto" as the default region
    s3ForcePathStyle: true, // Required for R2 compatibility
});

const app = express();

app.get("/*", async (req, res) => {
    try {
        const host = req.hostname;
        const id = host.split(".")[0];
        const filePath = req.path;

        const contents = await s3.getObject({
            Bucket: "deploycell",
            Key: `dist/${id}${filePath}`
        }).promise();

        const type = mime.lookup(filePath) || "application/octet-stream";
        res.set("Content-Type", type);

        res.send(contents.Body);
    } catch (error: any) {
        console.error("Error fetching object from S3:", error.message);
        res.status(404).send("File not found");
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Listening on Port ${PORT}`));