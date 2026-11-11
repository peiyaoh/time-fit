import React, { Fragment } from "react";
import { DateTime } from "luxon";
import { DataGrid } from "@mui/x-data-grid";
import ObjectListExortToolbar from "./ObjectListExortToolbar.js";
import TaskLogDisplayHelper from "@time-fit/helper/TaskLogDisplayHelper";

export default function TaskLogTable({ infoList, userInfo, renderData }) {

  const columns = [
    {
      field: "taskLabel",
      headerName: "Task Label",
      sortable: true,
      width: 140,
    },
    { field: "username", headerName: "Username", sortable: true, width: 130 },
    {
      field: "isActivated",
      headerName: "isActivated",
      sortable: true,
      width: 70,
      valueGetter: (params) => `${JSON.stringify(params.row.isActivated)}`,
    },
    {
      field: "activationReasoning",
      headerName: "Activation Reasoning",
      width: 320,
      valueGetter: (params) =>
        `${JSON.stringify(params.row.activationReasoning)}`,
    },
    {
      field: "randomizationResult",
      headerName: "Randomization Result",
      //description: 'This column has a value getter and is not sortable.',
      sortable: false,
      //width: 160,
      valueGetter: (params) =>
        `${TaskLogDisplayHelper.convertRandomizationResultToString(
          params.row.randomizationResult
        )}`,
    },
    {
      field: "action",
      headerName: "Action",
      sortable: false,
      // width: 160,
      valueGetter: (params) =>
        TaskLogDisplayHelper.extractOutcomeToString(
          params.row.randomizationResult != undefined
            ? params.row.randomizationResult.theChoice
            : undefined
        ),
    },
    {
      field: "executionResult",
      headerName: "Execution Result",
      sortable: false,
      //width: 160,
      valueGetter: (params) =>
        TaskLogDisplayHelper.convertExecutionResultToString(
          params.row.executionResult
        ),
    },
    {
      field: "createAtYourTime",
      headerName: "Created At (your time)",
      sortable: true,
      width: 320,
      valueGetter: (params) =>
        DateTime.fromISO(params.row.createdAt).toLocaleString(
          DateTime.DATETIME_FULL
        ),
    },
    {
      field: "createdAt",
      headerName: "Created At",
      description: "This column has a value getter and is not sortable.",
      sortable: true,
      width: 320,
      valueGetter: (params) => params.row.createdAt,
    },
    {
      field: "updatedAt",
      headerName: "Updated At",
      sortable: true,
      //width: 160,
      valueGetter: (params) => params.row.updatedAt,
    },
    {
      field: "userInfoCache",
      headerName: "User Info Cache",
      sortable: false,
      //width: 160,
      valueGetter: (params) =>
        TaskLogDisplayHelper.extractUserGroupMembershipToString(
          params.row.userInfoCache
        ),
    },
  ];

  return (
    <Fragment>
      <br />
      <ObjectListExortToolbar
        filePrefix={"TaskLog"}
        infoList={infoList}
        userInfo={userInfo}
      ></ObjectListExortToolbar>
      <br />
      {renderData ? (
        <div style={{ height: 400, width: "100%" }}>
          <DataGrid
            rows={infoList}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
            checkboxSelection
          />
        </div>
      ) : null}
    </Fragment>
  );
}
