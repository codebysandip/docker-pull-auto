const fs = require("fs");
const path = require("path");
const arguments = process.argv.slice(2);
const obj = {};
arguments.forEach((arg) => {
  const splittedVal = arg.split("=");
  if (splittedVal.length !== 2) {
    console.error(`Argument ${arg} should follow key=value`);
    process.exit(1);
  }
  obj[splittedVal[0]] = splittedVal[1];
});

// if (!obj.dir) {
//     console.error(`Pass dir argument like this dir=path/of/your/directory`);
//     process.exit(1);
// }
const dir = path.join(process.cwd(), obj.dir || "");

if (!obj.file) {
  console.error(`Pass file argument like this file=file-name-with-extension`);
  process.exit(1);
}
const filePath = path.join(dir, obj.file);

if (!obj.envKey) {
  console.error(`Pass envKey argument like this envKey=environment-key`);
  process.exit(1);
}
const content = process.env[obj.envKey];
if (!content) {
  return;
}

fs.access(dir, fs.constants.F_OK, (err) => {
  if (err) {
    console.log(`Directory ${dir} doesn't exist, creating now.`);
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(`${filePath}`, content, { encoding: "utf-8" });
    console.log(`File ${filePath} created successfully with content`);
    console.log(content);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});
