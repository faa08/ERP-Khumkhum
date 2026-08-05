const fs = require('fs');
const path = require('path');
const glob = require('glob');

// We don't have glob installed locally, so let's do a simple fs recursive read for master pages
const masterDir = path.join(process.cwd(), 'src', 'app', '(shell)', 'master');
const userPage = path.join(process.cwd(), 'src', 'app', '(shell)', 'settings', 'users', 'page.tsx');
const authGuard = path.join(process.cwd(), 'src', 'components', 'auth', 'AuthGuard.tsx');
const userForm = path.join(process.cwd(), 'src', 'app', '(shell)', 'settings', 'users', 'UserFormDrawer.tsx');
const userDetail = path.join(process.cwd(), 'src', 'app', '(shell)', 'settings', 'users', 'UserDetailModal.tsx');

function fixPageFiles() {
  const folders = fs.readdirSync(masterDir);
  const filesToFix = folders
    .map(f => path.join(masterDir, f, 'page.tsx'))
    .filter(f => fs.existsSync(f));
    
  filesToFix.push(userPage);

  for (const file of filesToFix) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix useToast: addToast -> toast
    content = content.replace(/const { addToast } = useToast\(\);/g, 'const toast = useToast();');
    content = content.replace(/addToast\({ title: (.+?), variant: 'success' }\)/g, 'toast.success($1)');
    content = content.replace(/addToast\({ title: (.+?), variant: 'danger' }\)/g, 'toast.error($1)');
    
    // Fix StatusBadge children -> label
    content = content.replace(/<StatusBadge status={(.+?)}>\s*{(.+?)}\s*<\/StatusBadge>/gs, '<StatusBadge status={$1} label={$2} />');
    
    // Fix DataTable searchable and searchField
    content = content.replace(/searchable searchField=".*?"/g, '');
    content = content.replace(/searchable\s*\n\s*searchField=".*?"/g, '');

    // Fix ConfirmDialog intent -> variant
    content = content.replace(/intent: 'primary'/g, "variant: 'primary'");
    content = content.replace(/intent: 'danger'/g, "variant: 'danger'");
    content = content.replace(/intent: 'warning'/g, "variant: 'danger'"); // only primary or danger
    content = content.replace(/intent=/g, "variant=");
    content = content.replace(/intent: (isActivating \? 'primary' : 'danger')/g, "variant: $1");
    content = content.replace(/intent: ('danger' \| 'warning' \| 'primary')/g, "variant: 'danger' | 'primary'");

    content = content.replace(/intent=\{confirmDialog\.intent\}/g, "variant={confirmDialog.variant}");
    content = content.replace(/intent: confirmDialog\.intent/g, "variant: confirmDialog.variant");
    content = content.replace(/confirmDialog\.intent/g, "confirmDialog.variant");

    fs.writeFileSync(file, content, 'utf8');
  }
}

function fixAuthGuard() {
  if (fs.existsSync(authGuard)) {
    let content = fs.readFileSync(authGuard, 'utf8');
    content = content.replace(/import { Spinner } from '@\/components\/ui\/Spinner';/g, '');
    content = content.replace(/<Spinner size="lg" \/>/g, '<span>Loading...</span>');
    content = content.replace(/actionLabel="Go to Dashboard"/g, 'action={{ label: "Go to Dashboard", onClick: () => router.push(ROUTES.DASHBOARD) }}');
    content = content.replace(/onAction={.*?}/g, '');
    fs.writeFileSync(authGuard, content, 'utf8');
  }
}

function fixUserForm() {
  if (fs.existsSync(userForm)) {
    let content = fs.readFileSync(userForm, 'utf8');
    // Type 'string' is not assignable to type 'UserRole | undefined'
    content = content.replace(/await onSubmit\(data\);/g, 'await onSubmit(data as Partial<User>);');
    fs.writeFileSync(userForm, content, 'utf8');
  }
}

function fixUserDetail() {
  if (fs.existsSync(userDetail)) {
    let content = fs.readFileSync(userDetail, 'utf8');
    content = content.replace(/<StatusBadge status={(.+?)}>\s*{(.+?)}\s*<\/StatusBadge>/gs, '<StatusBadge status={$1} label={$2} />');
    fs.writeFileSync(userDetail, content, 'utf8');
  }
}

try {
  fixPageFiles();
  fixAuthGuard();
  fixUserForm();
  fixUserDetail();
  console.log('Fixes applied.');
} catch (err) {
  console.error(err);
}
