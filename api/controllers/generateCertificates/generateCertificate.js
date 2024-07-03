import bodyParser from "body-parser";
import Web3 from "web3";
import { keccak256 } from "ethereumjs-util";
import prisma from "../../lib/prisma.js";
import Jimp from "jimp";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import abi from "../../abis/CertificateStorage.json" assert { type: "json" };
const CertificateStorage = { abi };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const contractAddress = "0x87F04E9B5F0b0033194d3949af57aeA2603A7761"; // Replace with your deployed contract address
const certificateStorage = new web3.eth.Contract(
  CertificateStorage.abi,
  contractAddress
);

// Function to store certificate hash in blockchain
const storeCertificateHash = async (userId, certificateData) => {
  const certificateDataBuffer = Buffer.from(certificateData, "base64"); // Convert to Buffer
  const combinedBuffer = Buffer.concat([
    Buffer.from(`${userId}`),
    certificateDataBuffer,
  ]);
  const hash = keccak256(combinedBuffer).toString("hex"); // Generate hash from combined Buffer
  const accounts = await web3.eth.getAccounts();
  await certificateStorage.methods
    .storeCertificateHash(`0x${hash}`)
    .send({ from: accounts[0] });
  return `0x${hash}`;
};

// Function to generate certificates and send email
const generateCertificates = async (userId) => {
  const user = await prisma.excel.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const certificateTemplate = await Jimp.read(
    path.join(__dirname, "/images/temp.png")
  );
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);

  const namePositionY = 600; // Adjusted position of the name
  const nameText = certificateTemplate.print(
    font,
    900,
    namePositionY,
    user.name
  );

  // Generate and store certificate hash
  const certificateDataBuffer = await certificateTemplate.getBufferAsync(
    Jimp.MIME_PNG
  );
  //contract call
  const certificateHash = await storeCertificateHash(
    user.id,
    certificateDataBuffer
  );
  console.log(certificateHash);

  // Display hash on the certificate (optional)
  const hashFont = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
  certificateTemplate.print(
    hashFont,
    100,
    1300,
    `Certificate Hash: ${certificateHash}`
  );

  const outputPath = path.join(__dirname, `certificate-${user.id}.png`);
  await certificateTemplate.writeAsync(outputPath);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.USER_EMAIL,
      pass: process.env.APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.USER_EMAIL,
    to: user.email,
    subject: "Your Certificate of Achievement",
    text: "Congratulations on your achievement! Please find your certificate attached.",
    attachments: [
      {
        filename: `certificate-${user.id}.png`,
        path: outputPath,
      },
    ],
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
};

export const generateCertificate = async (req, res) => {
  const users = await prisma.excel.findMany();
  for (const user of users) {
    try {
      await generateCertificates(user.id);
      console.log(`Generated certificates for user ${user.name}`);
      res
        .status(200)
        .json({ message: "Successfully Certificates Generated!!" });
    } catch (error) {
      console.error(
        `Error generating certificate for user ${user.name}:`,
        error
      );
      res.status(500).json({ message: "Failed to generate certificates!!" });
    }
  }
};

export const verifyCertificate = async (req, res) => {
  const { hashKey } = req.body;
  console.log("fyvuhg", hashKey);

  try {
    const isValid = await certificateStorage.methods
      .verifyCertificateHash(`${hashKey}`)
      .call();
    if (isValid) {
      console.log("Valid");
      res
        .status(200)
        .json({ message: "Successfully to verified certificates!!" });
    } else {
      res.status(403).json({ message: "Failed to verify certificates!!" });
      console.log("Not valid");
    }
  } catch (error) {
    console.error("Error verifying certificate:", error);
    res
      .status(500)
      .json({ valid: false, message: "Error verifying certificate." });
  }
};
