export default class MJMLHelper {
  constructor() {}

  static getHTMLFromMJMLSectionList(mjmlSectionList) {
    let htmlString = "";

    let tempString = `<mjml>
    <mj-body width="100%">
    ${mjmlSectionList
      .map((mjmlSection) => {
        return mjmlSection;
      })
      .join("")}
    </mj-body>
    </mjml>`;

    return mjml2html(tempString, { beautify: true });
  }

  static getMJMLTextSection(title) {
    let mjmlSectionString = "";

    if (title.length == 0) {
      return mjmlSectionString;
    }

    mjmlSectionString = `
      <mj-section width="100%">
        <mj-column width="100%">
        <mj-text  align="center"
        font-style="italic"
            font-size="20px"
            color="#626262">
            ${title}
        </mj-text>
        </mj-column>
      </mj-section>`;

    return mjmlSectionString;
  }

  static getMJMLHTMLTableSectionFromObjectList(
    objectList,
    headerList,
    headerLabelList,
    columnWidthList = []
  ) {
    let mjmlSectionString = "";

    if (objectList.length == 0) {
      return mjmlSectionString;
    }

    let myHeaderList =
      headerList == undefined ? Object.keys(objectList[0]) : headerList;
    let myHeaderLabelList =
      headerLabelList == undefined ? myHeaderList : headerLabelList;

    let widthPerCharacter = 20;

    mjmlSectionString = `
      <mj-section width="100%">
        <mj-column width="100%">
          <mj-table width="100%">
            <tr style="border-bottom:1px solid;text-align:left;padding:15px 0;">
              ${myHeaderLabelList
                .map((columnName) => {
                  return `<th style="width: ${
                    columnName.length * widthPerCharacter
                  };padding: 0 15px;">${columnName}</th>`;
                })
                .join("")}</tr>${objectList
      .map((info) => {
        return `<tr style="border-bottom:1px solid;text-align:left;padding:15px 0;">
                    ${myHeaderList
                      .map((columnName, columnIndex) => {
                        if (
                          columnWidthList != undefined &&
                          columnWidthList.length > 0
                        ) {
                          return `<td style="padding: 0 15px; width: ${columnWidthList[columnIndex]}">${info[columnName]}</td>`;
                        } else {
                          return `<td style="padding: 0 15px;">${info[columnName]}</td>`;
                        }
                      })
                      .join("")}
                </tr>`;
      })
      .join("")}</mj-table>
        </mj-column>
      </mj-section>`;

    return mjmlSectionString;
  }

  static getHTMLTableFromObjectList(objectList, headerList, headerLabelList) {
    let htmlString = "";

    if (objectList.length == 0) {
      return { html: htmlString, errors: [] };
    }

    let myHeaderList =
      headerList == undefined ? Object.keys(objectList[0]) : headerList;
    let myHeaderLabelList =
      headerLabelList == undefined ? myHeaderList : headerLabelList;

    let widthPerCharacter = 20;

    let tempString = `<mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-table>
            <tr style="border-bottom:1px solid #ecedee;text-align:left;padding:15px 0;">
              ${myHeaderLabelList
                .map((columnName) => {
                  return `<th style="width: ${
                    columnName.length * widthPerCharacter
                  };padding: 0 15px;">${columnName}</th>`;
                })
                .join("")}</tr>${objectList
      .map((info) => {
        return `<tr>
                    ${myHeaderList
                      .map((columnName) => {
                        return `<td style="padding: 0 15px;">${info[columnName]}</td>`;
                      })
                      .join("")}
                </tr>`;
      })
      .join("")}</mj-table>
        </mj-column>
      </mj-section>
    </mj-body>
    </mjml>`;

    return mjml2html(tempString, { beautify: true });
  }
}
