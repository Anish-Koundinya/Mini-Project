import prisma from "../lib/prisma.js";
import csv from "csvtojson";
export const importUser = async (req, res, next) => {
  try {
    const userData = [];

    csv()
      .fromFile(req.file.path)
      .then(async (response) => {
        response.map((res) => {
          userData.push({
            name: res.name,
            email: res.email,
          });
        });

        await prisma.excel.createMany({
          data: userData,
        });
        console.log("Data uploaded to mongoDB");
      });
    res.status(200).json({ message: "Successfully uploaded csv file!!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to upload csv file!!" });
  }
};
