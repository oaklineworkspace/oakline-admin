import AdminAuth from '../../components/AdminAuth';
import AdminFooter from '../../components/AdminFooter';

export default function AdminRoles() {
  return (
    <AdminAuth>
      <div style={styles.container}>
        <div>Placeholder for Admin Roles Page</div>
        <AdminFooter />
      </div>
    </AdminAuth>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    paddingBottom: '80px'
  }
};
