import React, { Fragment } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

export default function FitbitSubscriptionTable({ infoList, renderData }) {
  return (
    <Fragment>
      {renderData ? (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell>Id</TableCell>
                <TableCell align="right">Collection Type</TableCell>
                <TableCell align="right">Owner Id</TableCell>
                <TableCell align="right">Owner Type</TableCell>
                <TableCell align="right">Subscriber Id</TableCell>
                <TableCell align="right">Subscription Id</TableCell>

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
                  <TableCell component="th" scope="row">
                    {row.id}
                  </TableCell>
                  <TableCell align="right">{row.collectionType}</TableCell>
                  <TableCell align="right">{row.ownerId}</TableCell>
                  <TableCell align="right">{row.ownerType}</TableCell>
                  <TableCell align="right">{row.subscriberId}</TableCell>
                  <TableCell align="right">{row.subscriptionId}</TableCell>

                  <TableCell align="right">{row.createdAt}</TableCell>
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
