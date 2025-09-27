
import React, { useState } from 'react';
import { FileText, Download, Shield, Database, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { generateComplianceReport, generateDataProcessingRecord, generateSecurityReport, downloadComplianceDocument } from '@/lib/complianceUtils';

const ComplianceSettings = () => {
  const [loading, setLoading] = useState(null);

  const handleDownloadReport = async (reportType) => {
    setLoading(reportType);
    try {
      let content, filename;
      
      switch (reportType) {
        case 'compliance':
          content = await generateComplianceReport('full');
          filename = `hydroscan-compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'processing':
          content = await generateDataProcessingRecord();
          filename = `hydroscan-data-processing-record-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'security':
          content = await generateSecurityReport();
          filename = `hydroscan-security-report-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        default:
          throw new Error('Unknown report type');
      }
      
      downloadComplianceDocument(content, filename);
      toast({ 
        title: "Download Complete", 
        description: `${filename} has been downloaded successfully.` 
      });
    } catch (error) {
      toast({ 
        title: "Download Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(null);
    }
  };

  const complianceReportContent = `
## HydroScan Compliance Overview

**Last Updated:** ${new Date().toLocaleDateString()}

HydroScan is committed to data security and privacy. This platform implements comprehensive compliance measures for water quality monitoring systems.

### Data Security
- All data transmission encrypted via HTTPS/TLS 1.3
- Database encryption at rest using Supabase security standards
- API key-based authentication for all endpoints
- Row-level security policies implemented

### Data Privacy (GDPR Compliance)
- **Data Minimization:** We collect only necessary data for water quality monitoring
- **Purpose Limitation:** Data is used solely for HydroScan platform functionality
- **User Rights:** Users can access, export, and delete their data
- **Consent Management:** Clear opt-in/opt-out mechanisms

### Regulatory Compliance
- ISO 27001 security management principles
- GDPR data protection requirements
- Industry-standard water quality monitoring protocols

For detailed compliance documentation, download the full reports below.
  `;
  return (
    <Card className="glass-effect border-slate-700">
        <CardHeader>
            <CardTitle className="text-white flex items-center"><FileText className="mr-2"/>Compliance Center</CardTitle>
            <CardDescription className="text-slate-400">View information about HydroScan's data handling and compliance policies (mock data).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-md max-h-96 overflow-y-auto prose prose-sm prose-invert scrollbar-hide">
                <pre className="whitespace-pre-wrap text-xs">{complianceReportContent}</pre>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button 
                    onClick={() => handleDownloadReport('compliance')} 
                    disabled={loading === 'compliance'}
                    className="gradient-bg flex items-center justify-center"
                >
                    {loading === 'compliance' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <FileText className="h-4 w-4 mr-2" />
                    )}
                    Full Compliance Report
                </Button>
                
                <Button 
                    onClick={() => handleDownloadReport('processing')} 
                    disabled={loading === 'processing'}
                    variant="outline" 
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center justify-center"
                >
                    {loading === 'processing' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Database className="h-4 w-4 mr-2" />
                    )}
                    Data Processing Record
                </Button>
                
                <Button 
                    onClick={() => handleDownloadReport('security')} 
                    disabled={loading === 'security'}
                    variant="outline" 
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 flex items-center justify-center"
                >
                    {loading === 'security' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Shield className="h-4 w-4 mr-2" />
                    )}
                    Security Assessment
                </Button>
            </div>
            
            <div className="text-xs text-slate-500 mt-4">
                <p>• Reports are generated in real-time based on current system data</p>
                <p>• All documents include digital timestamps and audit trails</p>
                <p>• Reports are suitable for regulatory compliance submissions</p>
            </div>
        </CardContent>
    </Card>
  );
};

export default ComplianceSettings;
