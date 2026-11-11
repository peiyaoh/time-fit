import React, { Fragment } from 'react';
import { Button } from '@mui/material';
import { DateTime } from "luxon";
import FileFormatHelper from '@time-fit/helper/FileFormatHelper';

export default function ObjectListExportToolbar({ infoList, userInfo, filePrefix }) {
  const exportJSON = () => {
    const fileString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(infoList)
    )}`;
    const link = document.createElement("a");
    link.href = fileString;

    const timeString = DateTime.now().toISO();

    link.download = `${filePrefix}_${userInfo.username}_${timeString}.json`;
    link.click();
  };

  const exportTSV = () => {
    const csvString = FileFormatHelper.getTSVStringFromObjectList(infoList);

    // for TSV
    const fileString = `data:text/tab-separated-values;chatset=utf-8,${encodeURIComponent(
      csvString
    )}`;

    const link = document.createElement("a");
    link.href = fileString;

    const timeString = DateTime.now().toISO();

    link.download = `${filePrefix}_${userInfo.username}_${timeString}.tsv`;
    link.click();
  };

  return (
    <Fragment>
      <div>
        <span>Item count: {infoList.length}</span>&nbsp;&nbsp;
        <Button variant="contained" onClick={exportJSON}>
          Export JSON
        </Button>&nbsp;&nbsp;
        <Button variant="contained" onClick={exportTSV}>
          Export TSV
        </Button>
      </div>
      <div>
        {infoList.length > 0 ? (
          <div>Item[0]: {JSON.stringify(infoList[0])}</div>
        ) : null}
      </div>
    </Fragment>
  );
}
