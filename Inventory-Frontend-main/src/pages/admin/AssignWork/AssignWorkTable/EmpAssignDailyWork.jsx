import React, { useEffect, useState } from 'react';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { Box, Card, CardContent, Typography, Button, TextField } from '@mui/material';
import Swal from 'sweetalert2';
import config from "@/config";


export function EmpAssignDailyWork() {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [publishData, setPublishData] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [rawData, setRawData] = useState([]); // Store raw data for ID mapping
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetch(`${config.apiurl}/offer/empwise-daily-work`)
      .then((response) => response.json())
      .then((result) => {
        const rawDataFromAPI = result.data;
        setRawData(rawDataFromAPI); // Store raw data

        const formattedData = {
          offers: [...new Set(rawDataFromAPI.map(item => item.offerId._id))].map(offerId => ({
            offerId,
            employees: rawDataFromAPI
              .filter(item => item.offerId._id === offerId)
              .map(item => ({
                empId: item.employeeId._id,
                count: item.entryCount || 0
              }))
          }))
        };

        setPublishData(formattedData);

        const uniqueOffers = [...new Set(rawDataFromAPI.map(item => item.offerId.offerName))];
        const uniqueEmployees = [...new Set(rawDataFromAPI.map(item => item.employeeId.fullName))];

        const pivotData = uniqueOffers.map(offer => {
          const row = { offerName: offer };
          uniqueEmployees.forEach(fullName => {
            const entry = rawDataFromAPI.find(
              item => item.offerId.offerName === offer && item.employeeId.fullName === fullName
            );
            row[fullName] = entry && entry.entryCount !== undefined ? entry.entryCount : 0;
          });
          return row;
        });

        // Create editable cell component
        const EditableCell = ({ cell, table }) => {
          const cellKey = `${cell.row.original.offerName}-${cell.column.id}`;
          const isEditing = editingCell === cellKey;
          const value = cell.getValue();

          const handleDoubleClick = () => {
            if (value > 0) { // Only allow editing if there's a value > 0
              setEditingCell(cellKey);
              setEditValue(value.toString());
            }
          };

          const handleBlur = async () => {
            if (isEditing) {
              await saveValue();
            }
          };

          const handleKeyPress = async (e) => {
            if (e.key === 'Enter') {
              await saveValue();
            } else if (e.key === 'Escape') {
              setEditingCell(null);
              setEditValue('');
            }
          };

          const saveValue = async () => {
            const newValue = parseInt(editValue) || 0;
            
            // Find the corresponding raw data entry
            const entry = rawDataFromAPI.find(
              item => item.offerId.offerName === cell.row.original.offerName && 
                     item.employeeId.fullName === cell.column.id
            );

            if (entry && entry._id) {
              try {
                const response = await fetch(`${config.apiurl}/offer/update-entry-counts`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    updates: [{
                      id: entry._id,
                      entryCount: newValue
                    }]
                  })
                });

                if (response.ok) {
                  // Update local data
                  const updatedData = data.map(row => {
                    if (row.offerName === cell.row.original.offerName) {
                      return { ...row, [cell.column.id]: newValue };
                    }
                    return row;
                  });
                  setData(updatedData);

                  // Update raw data
                  const updatedRawData = rawDataFromAPI.map(item => {
                    if (item._id === entry._id) {
                      return { ...item, entryCount: newValue };
                    }
                    return item;
                  });
                  setRawData(updatedRawData);

                   console.log('Entry updated successfully:', {
    id: entry._id,
    oldValue: cell.getValue(),
    newValue: newValue,
    offer: cell.row.original.offerName,
    employee: cell.column.id
  });
                  
                  Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'Entry count updated successfully',
                    timer: 1500,
                    showConfirmButton: false
                  });
                } else {
                  throw new Error('Failed to update');
                }
              } catch (error) {
                console.error('Error updating entry count:', error);
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: 'Failed to update entry count',
                });
              }
            }

            setEditingCell(null);
            setEditValue('');
          };

          if (isEditing) {
            return (
              <TextField
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyPress}
                type="number"
                autoFocus
                size="small"
                sx={{
                  width: '80px',
                  '& .MuiInputBase-input': {
                    textAlign: 'left',
                    padding: '4px 8px'
                  }
                }}
              />
            );
          }

          return (
            <Box
              onDoubleClick={handleDoubleClick}
              sx={{
                cursor: value > 0 ? 'pointer' : 'default',
                padding: '4px 8px',
                                  width: '80px',

                minHeight: '24px',
                display: 'flex',
                alignItems: 'left',
                justifyContent: 'left',
                '&:hover': {
                  backgroundColor: value > 0 ? '#f5f5f5' : 'transparent'
                }
              }}
            >
              {value > 0 ? value : '-'}
            </Box>
          );
        };

        const dynamicColumns = [
          {
            accessorKey: 'offerName',
            header: 'Offer Name',
            size: 150,
          },
          ...uniqueEmployees.map(fullName => ({
            accessorKey: fullName,
            header: fullName,
            size: 150,
            Cell: EditableCell,
          })),
        ];

        setColumns(dynamicColumns);
        setData(pivotData);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch data',
        });
      });
  }, [editingCell, editValue]);

  const handlePublish = async () => {
    if (!publishData) {
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'No data to publish',
      });
      return;
    }

    try {
      // Show loading alert
      Swal.fire({
        title: 'Generating Preview...',
        text: 'Please wait while we prepare the distribution preview',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Step 1: Get distribution preview
      const previewResponse = await fetch(`${config.apiurl}/offer/preview-distribution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publishData),
      });

      const previewResult = await previewResponse.json();

      if (!previewResponse.ok) {
        throw new Error(previewResult.message || 'Failed to generate preview');
      }

      if (previewResult.success) {
        // Show distribution preview and confirmation in SweetAlert
        await showDistributionPreviewSwal(previewResult.data);
      } else {
        throw new Error(previewResult.message || 'Failed to generate preview');
      }

    } catch (error) {
      console.error('Error generating preview:', error);
      Swal.fire({
        icon: 'error',
        title: 'Preview Error',
        text: error.message || 'Failed to generate distribution preview',
      });
    }
  };

  // Function to show distribution preview in SweetAlert
  const showDistributionPreviewSwal = async (distributionData) => {
    let confirmedDistribution = [...distributionData.distributionPreview];

    const createDistributionHTML = (distribution) => {
      let html = `
        <div style="text-align: left; max-height: 500px; overflow-y: auto;">
          <!-- Summary -->
          <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px 0; color: #1565c0;">Distribution Summary</h3>
            <p style="margin: 0; color: #1976d2;">
              <strong>Total Entries:</strong> ${distributionData.totalEntries} across ${distributionData.totalOffers} offers
            </p>
          </div>

          <!-- Distribution Details -->
          <div style="space-y: 16px;">
      `;

      distribution.forEach((dist, offerIndex) => {
        html += `
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; color: #424242;">Offer: ${dist.offerId}</h4>
              <span style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                ${dist.totalEntriesForOffer} entries
              </span>
            </div>
        `;

        if (!dist.hasTrackingLinks) {
          html += `
            <div style="background: #fff3e0; border: 1px solid #ff9800; border-radius: 4px; padding: 12px;">
              <p style="margin: 0; color: #f57c00; font-size: 14px;">⚠ No tracking links found for this offer</p>
            </div>
          `;
        } else if (!dist.isValidMargin) {
          html += `
            <div style="background: #ffebee; border: 1px solid #f44336; border-radius: 4px; padding: 12px;">
              <p style="margin: 0; color: #d32f2f; font-size: 14px;">
                ⚠ Invalid margins (total: ${dist.totalMargin}%, should be 100%)
              </p>
            </div>
          `;
        } else {
          html += `<div style="margin-bottom: 12px;"><strong>Tracking Links:</strong></div>`;
          
          dist.trackingDistribution.forEach((track, trackIndex) => {
            html += `
              <div style="display: flex; align-items: center; background: #f9f9f9; padding: 12px; border-radius: 4px; margin-bottom: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 500; color: #212121; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${track.link}">
                    ${track.link}
                  </div>
                  <div style="font-size: 12px; color: #757575;">
                    Original: ${track.margin}% (${track.calculatedCount} entries)
                  </div>
                </div>
                <div style="margin-left: 12px;">
                  <input 
                    type="number" 
                    id="track-${offerIndex}-${trackIndex}"
                    value="${track.userAdjustedCount || track.calculatedCount}" 
                    min="0"
                    style="width: 80px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"
                    oninput="updateTrackingCount(${offerIndex}, ${trackIndex}, this.value)"
                  />
                </div>
              </div>
            `;
          });

          // Total validation - Add unique ID for each offer
          const totalAssigned = dist.trackingDistribution.reduce((sum, t) => sum + (t.userAdjustedCount || t.calculatedCount), 0);
          const isValid = totalAssigned === dist.totalEntriesForOffer;
          
          html += `
            <div style="text-align: right; margin-top: 8px;">
              <span style="font-size: 14px; color: #757575;">Total Assigned: </span>
              <span id="total-span-${offerIndex}" style="font-weight: 600; color: ${isValid ? '#4caf50' : '#f44336'};">
                ${totalAssigned} / ${dist.totalEntriesForOffer}
              </span>
            </div>
          `;
        }

        // Employee breakdown
        html += `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
            <div style="font-size: 14px; font-weight: 500; color: #757575; margin-bottom: 8px;">Employees:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
        `;
        
        dist.employees.forEach(emp => {
          html += `
            <span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
              ${emp.empId.slice(-8)}... (${emp.count})
            </span>
          `;
        });
        
        html += `</div></div></div>`;
      });

      html += `</div></div>`;
      return html;
    };

    // Global function to update tracking counts (accessible from inline HTML)
    window.updateTrackingCount = (offerIndex, trackIndex, newCount) => {
      confirmedDistribution[offerIndex].trackingDistribution[trackIndex].userAdjustedCount = parseInt(newCount) || 0;
      
      // Update the total display for the specific offer
      const dist = confirmedDistribution[offerIndex];
      const totalAssigned = dist.trackingDistribution.reduce((sum, t) => sum + (t.userAdjustedCount || t.calculatedCount), 0);
      const isValid = totalAssigned === dist.totalEntriesForOffer;
      
      // Find and update the specific total display element using unique ID
      const totalSpan = document.querySelector(`#total-span-${offerIndex}`);
      if (totalSpan) {
        totalSpan.style.color = isValid ? '#4caf50' : '#f44336';
        totalSpan.textContent = `${totalAssigned} / ${dist.totalEntriesForOffer}`;
      }
    };

    const validateDistribution = () => {
      return confirmedDistribution.every(dist => {
        const totalAdjusted = dist.trackingDistribution.reduce(
          (sum, track) => sum + (track.userAdjustedCount || track.calculatedCount), 0
        );
        return totalAdjusted === dist.totalEntriesForOffer;
      });
    };

    // Show the distribution preview with confirmation
    const result = await Swal.fire({
      title: 'Review Tracking Distribution',
      html: createDistributionHTML(confirmedDistribution),
      width: '800px',
      showCancelButton: true,
      confirmButtonText: 'Confirm & Publish',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#4caf50',
      cancelButtonColor: '#757575',
      allowOutsideClick: false,
      preConfirm: () => {
        if (!validateDistribution()) {
          Swal.showValidationMessage('Please adjust counts to match total entries for each offer');
          return false;
        }
        return true;
      }
    });

    if (result.isConfirmed) {
      await confirmAndPublishSwal(confirmedDistribution);
    }

    // Clean up global function
    delete window.updateTrackingCount;
  };

  // Function to confirm and publish in SweetAlert
  const confirmAndPublishSwal = async (confirmedDistribution) => {
    try {
      // Show publishing progress
      Swal.fire({
        title: 'Publishing Data...',
        text: 'Creating entries with tracking distribution',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Step 2: Confirm and create entries with distribution
      const response = await fetch(`${config.apiurl}/offer/confirm-and-create-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offers: publishData.offers,
          confirmedDistribution: confirmedDistribution
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success alert
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          html: `
            <div style="text-align: center;">
              <p>Successfully created <strong>${result.data.totalEntries}</strong> entries</p>
              <p>with tracking distribution</p>
            </div>
          `,
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false
        });
        
        // Optional: Refresh data or redirect
        // window.location.reload();
        
      } else {
        throw new Error(result.message || 'Failed to create entries');
      }

    } catch (error) {
      console.error('Error creating entries:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Creation Error',
        text: error.message || 'Failed to create entries',
      });
    }
  };

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
        <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: '#1F2937' }}>
            Employee Wise Daily Work Table
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handlePublish}
            disabled={isLoadingPreview || isPublishing}
          >
            {(isLoadingPreview || isPublishing) ? 'Processing...' : 'Publish'}
          </Button>
        </CardContent>
      </Card>
      <MaterialReactTable table={useMaterialReactTable({
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
      })} />
    </Box>
  );
}

export default EmpAssignDailyWork;