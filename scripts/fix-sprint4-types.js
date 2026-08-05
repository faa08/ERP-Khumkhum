const fs = require('fs');
const path = require('path');

function fixDashboard() {
  const file = path.join(process.cwd(), 'src', 'app', '(shell)', 'dashboard', 'page.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import { Card, CardContent, CardHeader, CardTitle } from '@\/components\/ui\/Card';/g, "import { Card } from '@/components/ui/Card';");
  
  // Fix Tabs
  content = content.replace(/const \[activeTab, setActiveTab\] = useState\('executive'\);/, '');
  content = content.replace(/activeId={activeTab}\s*onChange={setActiveTab}\s*tabs={\[/s, 'tabs={[');
  content = content.replace(/{ id: 'executive', label: 'Executive Overview' },/g, "{ id: 'executive', label: 'Executive Overview', content: <ExecutiveDashboard /> },");
  content = content.replace(/{ id: 'operational', label: 'Daily Operations' }/g, "{ id: 'operational', label: 'Daily Operations', content: <OperationalDashboard /> }");
  content = content.replace(/<div style={{ marginTop: 'var\(--space-6\)' }}>.*?<\/div>/s, ''); // Remove the manual content rendering

  // Fix Card styling
  content = content.replace(/<Card header=\{<strong>Production Efficiency<\/strong>\} style={{ minHeight: '300px' }}>/g, "<div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}><Card header={<strong>Production Efficiency</strong>} style={{ flex: 1 }}>");
  content = content.replace(/<Card header=\{<strong>Warehouse Overview<\/strong>\} style={{ minHeight: '300px' }}>/g, "<div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}><Card header={<strong>Warehouse Overview</strong>} style={{ flex: 1 }}>");
  
  // Actually, wait, Card doesn't accept style prop.
  content = content.replace(/<div style=\{\{ minHeight: '300px', display: 'flex', flexDirection: 'column' \}\}>\s*<Card header=\{<strong>Production Efficiency<\/strong>\} style=\{\{ flex: 1 \}\}>/, "<Card header={<strong>Production Efficiency</strong>} className={styles.cardExpanded}>");
  // Let me just wrap them in a div and remove style from Card
  content = content.replace(/<Card header=\{<strong>Production Efficiency<\/strong>\} style={{ minHeight: '300px' }}>/g, "<div style={{ minHeight: '300px', display: 'flex' }}><Card header={<strong>Production Efficiency</strong>} className=\"flex-1\">");
  content = content.replace(/<Card header=\{<strong>Warehouse Overview<\/strong>\} style={{ minHeight: '300px' }}>/g, "<div style={{ minHeight: '300px', display: 'flex' }}><Card header={<strong>Warehouse Overview</strong>} className=\"flex-1\">");
  
  fs.writeFileSync(file, content, 'utf8');
}

function fixReports() {
  const file = path.join(process.cwd(), 'src', 'app', '(shell)', 'reports', 'page.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import { Card, CardContent } from '@\/components\/ui\/Card';/g, "import { Card } from '@/components/ui/Card';");
  content = content.replace(/<Card style={{ marginBottom: 'var\(--space-6\)' }}>\s*<CardContent>/s, "<div style={{ marginBottom: 'var(--space-6)' }}><Card>");
  content = content.replace(/<\/CardContent>\s*<\/Card>/s, "</Card></div>");
  fs.writeFileSync(file, content, 'utf8');
}

function fixSettings() {
  const file = path.join(process.cwd(), 'src', 'app', '(shell)', 'settings', 'page.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import { Card, CardContent } from '@\/components\/ui\/Card';/g, "import { Card } from '@/components/ui/Card';");
  
  content = content.replace(/const \[activeTab, setActiveTab\] = useState\('company'\);/, '');
  
  content = content.replace(/<div style=\{\{ marginTop: 'var\(--space-6\)' \}\}>\s*<Card>\s*<CardContent>/s, "");
  content = content.replace(/<\/CardContent>\s*<\/Card>\s*<\/div>/s, "");

  content = content.replace(/activeId={activeTab}\n\s*onChange={setActiveTab}\n\s*tabs={\[/s, 'tabs={[');
  
  // Now replace the tab definitions with the content
  content = content.replace(/{ id: 'company', label: 'Company Profile' },/g, "{ id: 'company', label: 'Company Profile', content: <CompanyProfile /> },");
  content = content.replace(/{ id: 'general', label: 'General Config' },/g, "{ id: 'general', label: 'General Config', content: <GeneralConfig /> },");
  content = content.replace(/{ id: 'production', label: 'Production Config' },/g, "{ id: 'production', label: 'Production Config', content: <ProductionConfig /> },");
  content = content.replace(/{ id: 'qc', label: 'QC Config' },/g, "{ id: 'qc', label: 'QC Config', content: <QcConfig /> },");
  content = content.replace(/{ id: 'warehouse', label: 'Warehouse Config' },/g, "{ id: 'warehouse', label: 'Warehouse Config', content: <WarehouseConfig /> },");
  content = content.replace(/{ id: 'preferences', label: 'App Preferences' },/g, "{ id: 'preferences', label: 'App Preferences', content: <AppPreferences /> },");

  // Remove the old manual content and convert it into components
  let newComponents = `
function CompanyProfile() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="Company Name"><Input defaultValue="KhumKhum Manufacturing" fullWidth /></FormField>
      <FormField label="Tax ID (NPWP)"><Input defaultValue="12.345.678.9-000.000" fullWidth /></FormField>
      <FormField label="Company Address"><Input defaultValue="Jl. Raya Industri No. 1, Bandung" fullWidth /></FormField>
      <FormField label="Contact Email"><Input defaultValue="info@khumkhum.co.id" fullWidth /></FormField>
      <FormField label="Contact Phone"><Input defaultValue="+62 22 1234567" fullWidth /></FormField>
    </div></Card>
  );
}

function GeneralConfig() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="System Timezone">
        <Select value="asia_jakarta" onChange={() => {}} options={[{ value: 'asia_jakarta', label: 'Asia/Jakarta (GMT+7)' }]} fullWidth />
      </FormField>
      <FormField label="Currency Symbol"><Input defaultValue="Rp" fullWidth /></FormField>
      <FormField label="Date Format">
        <Select value="ddmmyyyy" onChange={() => {}} options={[{ value: 'ddmmyyyy', label: 'DD/MM/YYYY' }]} fullWidth />
      </FormField>
    </div></Card>
  );
}

function ProductionConfig() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="Default Shift Hours"><Input type="number" defaultValue="8" fullWidth /></FormField>
      <FormField label="Auto-generate Batch Numbers">
        <Select value="yes" onChange={() => {}} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No (Manual entry)' }]} fullWidth />
      </FormField>
      <FormField label="Production Target Alert Threshold (%)"><Input type="number" defaultValue="10" fullWidth /></FormField>
    </div></Card>
  );
}

function QcConfig() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="Strict QC Mode (Block production on fail)">
        <Select value="yes" onChange={() => {}} options={[{ value: 'yes', label: 'Enabled' }, { value: 'no', label: 'Disabled' }]} fullWidth />
      </FormField>
      <FormField label="Default Sampling Rate (%)"><Input type="number" defaultValue="5" fullWidth /></FormField>
    </div></Card>
  );
}

function WarehouseConfig() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="Default Receiving Warehouse">
        <Select value="wh_main" onChange={() => {}} options={[{ value: 'wh_main', label: 'WH-Main (Raw Material)' }]} fullWidth />
      </FormField>
      <FormField label="Low Stock Alert Threshold">
        <Select value="20" onChange={() => {}} options={[{ value: '20', label: '20% of Capacity' }, { value: '10', label: '10% of Capacity' }]} fullWidth />
      </FormField>
    </div></Card>
  );
}

function AppPreferences() {
  return (
    <Card><div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '600px' }}>
      <FormField label="Theme">
        <Select value="light" onChange={() => {}} options={[{ value: 'light', label: 'Light Mode' }, { value: 'dark', label: 'Dark Mode' }, { value: 'system', label: 'System Default' }]} fullWidth />
      </FormField>
      <FormField label="Sidebar Default State">
        <Select value="expanded" onChange={() => {}} options={[{ value: 'expanded', label: 'Expanded' }, { value: 'collapsed', label: 'Collapsed' }]} fullWidth />
      </FormField>
      <FormField label="Notification Sound">
        <Select value="on" onChange={() => {}} options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} fullWidth />
      </FormField>
    </div></Card>
  );
}
`;

  content = content.replace(/\{activeTab === 'company'.*?\}\)}/gs, ''); 
  // Wait, regex might be tricky here, let's just do an exact match or substring split
  const splitIndex = content.indexOf('{activeTab === \'company\'');
  if (splitIndex > -1) {
    content = content.substring(0, splitIndex) + newComponents;
  }
  
  fs.writeFileSync(file, content, 'utf8');
}

fixDashboard();
fixReports();
fixSettings();
console.log('Fixes applied.');
