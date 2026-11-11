import React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

export default function TaskTable({ infoList, renderData }) {
  return (
    <>
      {renderData ? (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell align="right">Task Label</TableCell>
                <TableCell align="right">Enabled</TableCell>
                <TableCell align="right">preActivationLogging</TableCell>
                <TableCell align="right">Priority</TableCell>
                <TableCell align="right">Check Point</TableCell>
                <TableCell align="right">Group</TableCell>
                <TableCell align="right">Randomization</TableCell>
                <TableCell align="right">PreCondition</TableCell>
                <TableCell align="right">Created At</TableCell>
                <TableCell align="right">Updated At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {infoList.map((row, index) => (
                <TableRow
                  key={index}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell align="right">{row.label}</TableCell>
                  <TableCell align="right">
                    {row.enabled == true ? "true" : "false"}
                  </TableCell>
                  <TableCell align="right">
                    {row.preActivationLogging == true ? "true" : "false"}
                  </TableCell>
                  <TableCell align="right">{row.priority}</TableCell>
                  <TableCell align="right">
                    {JSON.stringify(row.checkPoint)}
                  </TableCell>
                  <TableCell align="right">
                    {JSON.stringify(row.group)}
                  </TableCell>
                  <TableCell align="right">
                    {JSON.stringify(row.randomization)}
                  </TableCell>
                  <TableCell align="right">
                    {JSON.stringify(row.preCondition)}
                  </TableCell>
                  <TableCell align="right">{row.createdAt}</TableCell>
                  <TableCell align="right">{row.updatedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </>
  );
}
