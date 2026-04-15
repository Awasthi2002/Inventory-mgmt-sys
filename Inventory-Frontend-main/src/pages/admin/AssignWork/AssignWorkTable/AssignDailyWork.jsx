import React, { useEffect, useState } from 'react';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { Box, Card, CardContent, Typography, Button, Stack } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import config from "@/config";


export function AssignDailyWork() {
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${config.apiurl}/offer/daily-assign-work`)
      .then((response) => response.json())
      .then((result) => setData(result.data))
      .catch((error) => console.error('Error fetching data:', error));
  }, []);

  const columns = [
    {
      accessorKey: 'offerId.offerName',
      header: 'Offer Name',
      size: 150,
    },
    {
      accessorKey: 'totalEntryCount',
      header: 'Total Entry Count',
      size: 150,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
      size: 150,
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data,
    enableColumnFilterModes: true,
    enableColumnOrdering: true,
    initialState: {
      density: 'compact',
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    muiTableBodyRowProps: ({ row }) => ({
      sx: {
        backgroundColor: row.index % 2 === 1 ? '#f5f5f5' : 'inherit',
      },
    }),
  });

  return (
    <Box sx={{ width: '100%' }}>
      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            sx={{ py: 1 }}
          >
            <Typography
              variant="h5"
              component="h1"
              sx={{
                fontWeight: 600,
                color: '#1F2937',
              }}
            >
              Assign Daily Work Table
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/admin/AssignWorkForm')}
              sx={{
                bgcolor: '#4F46E5',
                '&:hover': { bgcolor: '#3730A3' },
                textTransform: 'none',
                borderRadius: '8px',
                px: 3,
                py: 1,
              }}
            >
              Assign Daily Work Form
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <MaterialReactTable table={table} />
    </Box>
  );
}

export default AssignDailyWork;