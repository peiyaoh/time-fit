import React, { Fragment } from 'react';
import Link from "next/link";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Button } from '@mui/material';
import ObjectListExportToolbar from './ObjectListExportToolbar.js';

export default function DataTable({ 
  infoList, 
  userInfo, 
  hostURL, 
  renderData, 
  columns, 
  filePrefix = "Data",
  title = "Data Table"
}) {
  return (
    <Fragment>
      <br />
      <h2>{title}</h2>
      <ObjectListExportToolbar 
        filePrefix={filePrefix} 
        infoList={infoList} 
        userInfo={userInfo}
      />
      <br />
      {renderData ? (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                {columns.map((column, index) => (
                  <TableCell key={index} align={column.align || "right"}>
                    {column.header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {infoList.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex} align={column.align || "right"}>
                      {column.render ? 
                        column.render(row, rowIndex) : 
                        row[column.field]
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Fragment>
  );
}
