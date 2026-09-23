import React, { Fragment } from "react";
import { DateTime } from "luxon";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import ObjectListExortToolbar from "./ObjectListExortToolbar.js";

export default function FitbitDataTable({ infoList, userInfo, renderData }) {
  return (
    <Fragment>
      <br />
      <ObjectListExortToolbar
        filePrefix={"FitbitData"}
        infoList={infoList}
        userInfo={userInfo}
      ></ObjectListExortToolbar>
      <br />
      {renderData ? (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Id</TableCell>

                <TableCell align="right">Username</TableCell>
                <TableCell align="right">Owner Id</TableCell>
                <TableCell align="right">Data Type</TableCell>
                <TableCell align="right">Date Time</TableCell>
                <TableCell align="right">Content</TableCell>
                <TableCell align="right">Last Modified</TableCell>
                <TableCell align="right">Created At (your time)</TableCell>
                <TableCell align="right">Created At</TableCell>
                <TableCell align="right">Updated At</TableCell>
                <TableCell align="right">Updated At (your time)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {infoList.map((row, index) => (
                <TableRow
                  key={index}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {row.id}
                  </TableCell>
                  <TableCell align="right">{row.owner.username}</TableCell>
                  <TableCell align="right">{row.ownerId}</TableCell>
                  <TableCell align="right">{row.dataType}</TableCell>
                  <TableCell align="right">{row.dateTime}</TableCell>
                  <TableCell align="right">
                    {JSON.stringify(row.content, null, 2)}
                  </TableCell>
                  <TableCell align="right">{row.lastModified}</TableCell>
                  <TableCell align="right">
                    {DateTime.fromISO(row.createdAt).toLocaleString(
                      DateTime.DATETIME_FULL
                    )}
                  </TableCell>
                  <TableCell align="right">{row.createdAt}</TableCell>
                  <TableCell align="right">
                    {DateTime.fromISO(row.updatedAt).toLocaleString(
                      DateTime.DATETIME_FULL
                    )}
                  </TableCell>
                  <TableCell align="right">{row.updatedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Fragment>
  );
}
