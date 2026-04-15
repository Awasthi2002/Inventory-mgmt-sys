import React, { useEffect, useState } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import EditIcon from '@mui/icons-material/Edit';
import { Box, Chip, Stack, Typography, IconButton, Tooltip, Card, CardContent, Button } from '@mui/material';
import { ContentCopy, Launch, Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import config from "@/config";


export function EntryPanelTable() {
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${config.apiurl}/offer/get-all-offers`)
      .then((response) => response.json())
      .then((result) => setData(result))
      .catch((error) => console.error('Error fetching data:', error));
  }, []);

  const handleEditOffer = (offerId) => {
    navigate(`/admin/EntryPanelEdit/${offerId}`);
  };

  const columns = [
    {
      accessorKey: 'offerName',
      header: 'Offer Name',
      size: 150,
    },
    {
      accessorKey: 'clientId.fullName',
      header: 'Client Name',
      size: 210,
    },
    {
      accessorKey: 'previewLink',
      header: 'Preview Link',
      size: 150,
      Cell: ({ cell }) => {
        const link = cell.getValue();
        return (
          <Typography variant="caption" sx={{ fontWeight: 500, color: 'blue' }}>
            {link?.length > 30 ? `${link.substring(0, 30)}...` : link}
          </Typography>
        );
      },
    },
    {
      accessorKey: 'trackingLinks',
      header: 'Tracking Links',
      Cell: ({ cell }) => {
        const trackingLinks = cell.getValue() || [];
        
        const handleCopyLink = (link) => {
          navigator.clipboard.writeText(link);
        };

        const handleOpenLink = (link) => {
          window.open(link, '_blank');
        };

        return (
          <Box sx={{ maxWidth: '100%' }}>
            <Stack spacing={1}>
              {trackingLinks.map((linkObj, index) => (
                <Box key={linkObj._id || index} sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Copy Link">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyLink(linkObj.link)}
                        sx={{ padding: '2px' }}
                      >
                        <ContentCopy fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open Link">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenLink(linkObj.link)}
                        sx={{ padding: '2px' }}
                      >
                        <Launch fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    <Chip
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {linkObj.link?.length > 30 
                              ? `${linkObj.link.substring(0, 30)}...` 
                              : linkObj.link}
                          </Typography>
                        </Box>
                      }
                      variant="outlined"
                      size="small"
                      color="primary"
                      sx={{
                        maxWidth: '250px',
                        '& .MuiChip-label': {
                          padding: '2px 8px',
                        },
                      }}
                    />
                  </Box>
                  <Chip
                    label={`margin: ${linkObj.margin}%`}
                    variant="filled"
                    size="small"
                    color="success"
                    sx={{
                      width: 'fit-content',
                      fontSize: '0.8rem',
                      height: '20px',
                      '& .MuiChip-label': {
                        padding: 1,
                      },
                    }}
                  />
                </Box>
              ))}
              {trackingLinks.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No tracking links available
                </Typography>
              )}
            </Stack>
          </Box>
        );
      },
      size: 420,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
      size: 150,
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 100,
      Cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: '4px' }}>
          <Tooltip title="Edit">
            <IconButton 
              color="primary" 
              onClick={() => handleEditOffer(row.original._id)}
              size="small"
              sx={{ padding: '4px' }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data,
    enableColumnFilterModes: true,
    enableColumnOrdering: true,
    enableGrouping: true,
    enableFacetedValues: true,
    initialState: {
      showColumnFilters: false,
      showGlobalFilter: false,
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
              Offers Table 
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/admin/EntryPanelForm')}
              sx={{
                bgcolor: '#4F46E5',
                '&:hover': { bgcolor: '#3730A3' },
                textTransform: 'none',
                borderRadius: '8px',
                px: 3,
                py: 1,
              }}
            >
              Create Offer Form
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <MaterialReactTable table={table} />
    </Box>
  );
}

export default EntryPanelTable;