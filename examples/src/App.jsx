import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import './App.css';

const { Header, Content } = Layout;

const App = () => {
  return (
    <Layout className="app-container">
      <Header className="app-header">
        <h1 className="app-title">Lubanno7 Univer Sheet</h1>
      </Header>
      <Content className="app-main">
        <Outlet />
      </Content>
    </Layout>
  );
};

export default App;