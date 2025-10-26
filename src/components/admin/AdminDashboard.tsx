import {
  Box,
  Flex,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useColorModeValue,
} from '@chakra-ui/react';
import DashboardStats from './DashboardStats';
import InvestmentManagement from './InvestmentManagement';
import TransactionManagement from './TransactionManagement';
import UserManagement from './UserManagement';

const AdminDashboard = () => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const tabBgColor = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="100vh" bg={bgColor} p={4}>
      <Flex direction="column" maxW="7xl" mx="auto">
        <Heading mb={6}>Admin Dashboard</Heading>
        
        <Tabs isLazy variant="enclosed">
          <TabList>
            <Tab _selected={{ bg: tabBgColor }}>Overview</Tab>
            <Tab _selected={{ bg: tabBgColor }}>Users</Tab>
            <Tab _selected={{ bg: tabBgColor }}>Investments</Tab>
            <Tab _selected={{ bg: tabBgColor }}>Transactions</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <DashboardStats />
            </TabPanel>
            
            <TabPanel>
              <UserManagement />
            </TabPanel>

            <TabPanel>
              <InvestmentManagement />
            </TabPanel>

            <TabPanel>
              <TransactionManagement />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>
    </Box>
  );
};

export default AdminDashboard;