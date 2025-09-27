import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToCSV = async (deviceId, dateFrom, dateTo, parameters, includeMetadata = true) => {
  try {
    let query = supabase
      .from('sensor_readings')
      .select(`
        *,
        devices!inner(name, serial_number, location, installation_date)
      `)
      .gte('timestamp', dateFrom)
      .lte('timestamp', dateTo)
      .order('timestamp', { ascending: true });

    if (deviceId !== 'all') {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const headers = ['Timestamp', 'Device Name', 'Serial Number'];
    if (parameters.ph) headers.push('pH');
    if (parameters.turbidity) headers.push('Turbidity (NTU)');
    if (parameters.tds) headers.push('TDS (ppm)');
    if (parameters.temperature) headers.push('Temperature (°C)');
    if (parameters.contamination_score) headers.push('Contamination Score');
    if (includeMetadata) {
      headers.push('Location', 'Installation Date', 'Battery Level', 'Signal Strength');
    }

    const csvContent = [
      headers.join(','),
      ...data.map(row => {
        const values = [
          new Date(row.timestamp).toISOString(),
          row.devices.name,
          row.devices.serial_number
        ];
        if (parameters.ph) values.push(row.ph || '');
        if (parameters.turbidity) values.push(row.turbidity || '');
        if (parameters.tds) values.push(row.tds || '');
        if (parameters.temperature) values.push(row.temperature || '');
        if (parameters.contamination_score) values.push(row.contamination_score || '');
        if (includeMetadata) {
          values.push(
            row.devices.location || '',
            row.devices.installation_date || '',
            row.battery_level || '',
            row.signal_strength || ''
          );
        }
        return values.map(v => `"${v}"`).join(',');
      })
    ].join('\n');

    return csvContent;
  } catch (error) {
    throw new Error(`CSV export failed: ${error.message}`);
  }
};

export const exportToPDF = async (deviceId, dateFrom, dateTo, parameters, includeMetadata = true) => {
  try {
    let query = supabase
      .from('sensor_readings')
      .select(`
        *,
        devices!inner(name, serial_number, location, installation_date)
      `)
      .gte('timestamp', dateFrom)
      .lte('timestamp', dateTo)
      .order('timestamp', { ascending: true });

    if (deviceId !== 'all') {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('HydroScan Water Quality Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Date Range: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`, 20, 45);
    doc.text(`Device: ${deviceId === 'all' ? 'All Devices' : data[0]?.devices?.name || 'Unknown'}`, 20, 55);

    // Summary statistics
    if (data.length > 0) {
      const avgPh = data.filter(d => d.ph).reduce((sum, d) => sum + d.ph, 0) / data.filter(d => d.ph).length;
      const avgTurbidity = data.filter(d => d.turbidity).reduce((sum, d) => sum + d.turbidity, 0) / data.filter(d => d.turbidity).length;
      const avgTds = data.filter(d => d.tds).reduce((sum, d) => sum + d.tds, 0) / data.filter(d => d.tds).length;
      const avgTemp = data.filter(d => d.temperature).reduce((sum, d) => sum + d.temperature, 0) / data.filter(d => d.temperature).length;

      doc.text('Summary Statistics:', 20, 70);
      doc.text(`Average pH: ${avgPh.toFixed(2)}`, 30, 80);
      doc.text(`Average Turbidity: ${avgTurbidity.toFixed(2)} NTU`, 30, 90);
      doc.text(`Average TDS: ${avgTds.toFixed(0)} ppm`, 30, 100);
      doc.text(`Average Temperature: ${avgTemp.toFixed(1)} °C`, 30, 110);
    }

    // Data table
    const tableHeaders = ['Timestamp', 'Device'];
    const tableData = [];

    if (parameters.ph) tableHeaders.push('pH');
    if (parameters.turbidity) tableHeaders.push('Turbidity');
    if (parameters.tds) tableHeaders.push('TDS');
    if (parameters.temperature) tableHeaders.push('Temp');
    if (parameters.contamination_score) tableHeaders.push('Contamination');

    data.forEach(row => {
      const rowData = [
        new Date(row.timestamp).toLocaleString(),
        row.devices.name
      ];
      if (parameters.ph) rowData.push(row.ph?.toFixed(2) || '-');
      if (parameters.turbidity) rowData.push(row.turbidity?.toFixed(2) || '-');
      if (parameters.tds) rowData.push(row.tds?.toString() || '-');
      if (parameters.temperature) rowData.push(row.temperature?.toFixed(1) || '-');
      if (parameters.contamination_score) rowData.push(row.contamination_score?.toFixed(1) || '-');
      
      tableData.push(rowData);
    });

    doc.autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: 125,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    return doc.output('blob');
  } catch (error) {
    throw new Error(`PDF export failed: ${error.message}`);
  }
};

export const exportToJSON = async (deviceId, dateFrom, dateTo, parameters, includeMetadata = true) => {
  try {
    let query = supabase
      .from('sensor_readings')
      .select(`
        *,
        devices!inner(name, serial_number, location, installation_date)
      `)
      .gte('timestamp', dateFrom)
      .lte('timestamp', dateTo)
      .order('timestamp', { ascending: true });

    if (deviceId !== 'all') {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        dateRange: {
          from: dateFrom,
          to: dateTo
        },
        deviceFilter: deviceId,
        parametersIncluded: Object.keys(parameters).filter(key => parameters[key]),
        includeMetadata,
        totalRecords: data.length
      },
      readings: data.map(row => {
        const reading = {
          timestamp: row.timestamp,
          device_id: row.device_id,
          device_name: row.devices.name,
          serial_number: row.devices.serial_number
        };

        if (parameters.ph) reading.ph = row.ph;
        if (parameters.turbidity) reading.turbidity = row.turbidity;
        if (parameters.tds) reading.tds = row.tds;
        if (parameters.temperature) reading.temperature = row.temperature;
        if (parameters.contamination_score) reading.contamination_score = row.contamination_score;

        if (includeMetadata) {
          reading.metadata = {
            location: row.devices.location,
            installation_date: row.devices.installation_date,
            battery_level: row.battery_level,
            signal_strength: row.signal_strength
          };
        }

        return reading;
      })
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    throw new Error(`JSON export failed: ${error.message}`);
  }
};

export const downloadFile = (content, filename, contentType) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
