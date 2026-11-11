export default class FileFormatHelper {
  constructor() {}

  static getTSVStringFromObjectList(objectList) {
    let csvString = "";

    if (objectList.length == 0) {
      return csvString;
    }
    const headerList = Object.keys(objectList[0]);
    const headerString = headerList.join("\t");
    csvString += headerString + "\n";
    objectList.forEach((info) => {
      const contentList = headerList.map((columnName) => {
        return JSON.stringify(info[columnName]);
      });

      const contentString = contentList.join("\t");
      csvString += contentString + "\n";
    });

    return csvString;
  }
}
