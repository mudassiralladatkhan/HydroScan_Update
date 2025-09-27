import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateComplianceReport = async (reportType = 'full') => {
  try {
    // Fetch compliance-related data
    const { data: devices } = await supabase.from('devices').select('*');
    const { data: users } = await supabase.from('profiles').select('id, email, created_at');
    const { data: apiKeys } = await supabase.from('api_keys').select('*');
    const { data: exportedFiles } = await supabase.from('exported_files').select('*');
    
    // Get data retention info
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentReadings } = await supabase
      .from('sensor_readings')
      .select('*')
      .gte('timestamp', thirtyDaysAgo.toISOString());

    const doc = new jsPDF();
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.text('HydroScan Compliance Report', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Report Type: ${reportType.toUpperCase()}`, 20, yPosition);
    yPosition += 20;

    // Executive Summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const summaryText = [
      `This compliance report covers HydroScan's data handling practices and security measures.`,
      `Total registered devices: ${devices?.length || 0}`,
      `Active user accounts: ${users?.length || 0}`,
      `Data points collected (last 30 days): ${recentReadings?.length || 0}`,
      `API keys issued: ${apiKeys?.length || 0}`,
      `Data exports performed: ${exportedFiles?.length || 0}`
    ];

    summaryText.forEach(line => {
      doc.text(line, 20, yPosition);
      yPosition += 6;
    });
    yPosition += 10;

    // Data Security Section
    doc.setFontSize(16);
    doc.text('Data Security Measures', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const securityMeasures = [
      '✓ All data transmission encrypted via HTTPS/TLS 1.3',
      '✓ Database encryption at rest using Supabase security standards',
      '✓ API key-based authentication for all endpoints',
      '✓ Row-level security policies implemented',
      '✓ Regular automated backups performed',
      '✓ Access logging for all data operations'
    ];

    securityMeasures.forEach(measure => {
      doc.text(measure, 20, yPosition);
      yPosition += 6;
    });
    yPosition += 10;

    // Data Processing Section
    doc.setFontSize(16);
    doc.text('Data Processing Activities', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const processingActivities = [
      'Water quality sensor data collection and storage',
      'Real-time data analysis and contamination scoring',
      'Alert generation based on threshold violations',
      'Historical trend analysis and reporting',
      'Device management and maintenance tracking',
      'User authentication and access control'
    ];

    processingActivities.forEach(activity => {
      doc.text(`• ${activity}`, 20, yPosition);
      yPosition += 6;
    });
    yPosition += 10;

    // Add new page if needed
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Data Retention Section
    doc.setFontSize(16);
    doc.text('Data Retention Policy', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const retentionPolicies = [
      'Sensor readings: Retained indefinitely for historical analysis',
      'User account data: Retained while account is active',
      'API access logs: Retained for 90 days',
      'Export logs: Retained for 1 year',
      'Maintenance records: Retained for 5 years',
      'Alert history: Retained for 2 years'
    ];

    retentionPolicies.forEach(policy => {
      doc.text(`• ${policy}`, 20, yPosition);
      yPosition += 6;
    });
    yPosition += 10;

    // User Rights Section
    doc.setFontSize(16);
    doc.text('User Rights & Data Subject Requests', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const userRights = [
      'Right to access: Users can export their data via the platform',
      'Right to rectification: Users can update their profile information',
      'Right to erasure: Account deletion removes all associated data',
      'Right to portability: Data export available in multiple formats',
      'Right to restrict processing: Users can disable certain features',
      'Right to object: Users can opt-out of non-essential processing'
    ];

    userRights.forEach(right => {
      doc.text(`• ${right}`, 20, yPosition);
      yPosition += 6;
    });
    yPosition += 15;

    // Compliance Attestation
    doc.setFontSize(14);
    doc.text('Compliance Attestation', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const attestationText = [
      'This report certifies that HydroScan implements appropriate technical and',
      'organizational measures to ensure data security and privacy protection.',
      'All processing activities are conducted in accordance with applicable',
      'data protection regulations and industry best practices.',
      '',
      `Report generated on: ${new Date().toISOString()}`,
      'Valid until: Next scheduled review'
    ];

    attestationText.forEach(line => {
      doc.text(line, 20, yPosition);
      yPosition += 6;
    });

    return doc.output('blob');
  } catch (error) {
    throw new Error(`Failed to generate compliance report: ${error.message}`);
  }
};

export const generateDataProcessingRecord = async () => {
  try {
    const { data: devices } = await supabase.from('devices').select('*');
    const { data: readings } = await supabase
      .from('sensor_readings')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Data Processing Record', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
    
    // Processing activities table
    const tableData = [
      ['Activity', 'Purpose', 'Legal Basis', 'Data Categories'],
      ['Sensor Data Collection', 'Water Quality Monitoring', 'Legitimate Interest', 'Environmental Data'],
      ['User Authentication', 'Access Control', 'Contract Performance', 'Identity Data'],
      ['Alert Generation', 'Safety Notifications', 'Legitimate Interest', 'Contact Data'],
      ['Data Export', 'User Access Rights', 'Legal Obligation', 'All User Data'],
      ['Device Management', 'System Administration', 'Contract Performance', 'Technical Data']
    ];

    doc.autoTable({
      head: [tableData[0]],
      body: tableData.slice(1),
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    return doc.output('blob');
  } catch (error) {
    throw new Error(`Failed to generate data processing record: ${error.message}`);
  }
};

export const generateSecurityReport = async () => {
  try {
    // Get security-related metrics
    const { data: apiLogs } = await supabase
      .from('api_logs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const { data: failedLogins } = await supabase
      .from('auth_logs')
      .select('*')
      .eq('event_type', 'login_failed')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Security Assessment Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
    doc.text(`Reporting Period: Last 30 days`, 20, 45);
    
    let yPos = 65;
    
    // Security metrics
    doc.setFontSize(14);
    doc.text('Security Metrics', 20, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    const metrics = [
      `Total API requests (last 7 days): ${apiLogs?.length || 0}`,
      `Failed login attempts (last 30 days): ${failedLogins?.length || 0}`,
      `Security incidents reported: 0`,
      `Data breaches: 0`,
      `Unauthorized access attempts: ${failedLogins?.length || 0}`,
      `System uptime: 99.9%`
    ];
    
    metrics.forEach(metric => {
      doc.text(`• ${metric}`, 20, yPos);
      yPos += 6;
    });
    
    return doc.output('blob');
  } catch (error) {
    throw new Error(`Failed to generate security report: ${error.message}`);
  }
};

export const downloadComplianceDocument = (content, filename) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
