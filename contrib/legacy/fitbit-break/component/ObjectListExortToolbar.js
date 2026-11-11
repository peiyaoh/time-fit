import React, { Fragment } from 'react';
import { ObjectListExportToolbar as BaseExportToolbar } from '@time-fit/web-components';

export default function ObjectListExortToolbar({ infoList, userInfo, filePrefix }) {
  return (
    <BaseExportToolbar
      infoList={infoList}
      userInfo={userInfo}
      filePrefix={filePrefix}
    />
  );
}
