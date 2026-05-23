import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { ZoneAnalysis as ZoneAnalysisType } from '../../types';
import { formatPercent } from '../../utils/format';

interface ZoneAnalysisTableProps {
  /** 乘区分析数据。 */
  analysis: ZoneAnalysisType;
}

/**
 * ZoneAnalysisTable — 乘区词条分析表。
 * 乘区名 | 当前词条 | 优化后词条 | 变化 | 伤害贡献
 */
function ZoneAnalysisTable({ analysis }: ZoneAnalysisTableProps): React.ReactElement {
  // 格式化词条数（保留1位小数）
  const fmtRolls = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5, color: 'primary.main' }}>
        乘区词条分析
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>乘区</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>当前词条</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>优化后词条</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>变化</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>伤害贡献</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {analysis.entries.map((entry) => {
              const isPositive = entry.rollChange > 0;
              const isNegative = entry.rollChange < 0;

              return (
                <TableRow key={entry.zoneName} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {entry.zoneName}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{fmtRolls(entry.currentRolls)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{fmtRolls(entry.optimizedRolls)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: isPositive ? 'success.main' : isNegative ? 'error.main' : 'text.primary',
                      }}
                    >
                      {entry.rollChange > 0 ? '+' : ''}{fmtRolls(entry.rollChange)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: entry.damageContribution > 0 ? 'success.main' : entry.damageContribution < 0 ? 'error.main' : 'text.secondary',
                      }}
                    >
                      {formatPercent(entry.damageContribution)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}

            {/* 合计行 */}
            <TableRow sx={{ borderTop: '2px solid', borderColor: 'divider' }}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  合计
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {fmtRolls(analysis.totalCurrentRolls)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {fmtRolls(analysis.totalOptimizedRolls)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {analysis.totalOptimizedRolls - analysis.totalCurrentRolls > 0 ? '+' : ''}
                  {fmtRolls(analysis.totalOptimizedRolls - analysis.totalCurrentRolls)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {formatPercent(analysis.totalImprovement)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default ZoneAnalysisTable;
