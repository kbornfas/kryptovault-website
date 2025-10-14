import {
  Badge,
  Box,
  Grid,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorModeValue
} from '@chakra-ui/react';
import axios from 'axios';
import { useQuery } from 'react-query';

const DashboardStats = () => {
  const { data: stats, isLoading } = useQuery('adminStats', () =>
    axios.get('/api/admin/dashboard').then((res) => res.data)
  );

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  return (
    <Box>
      <Grid templateColumns="repeat(4, 1fr)" gap={6} mb={8}>
        <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <StatLabel>Total Users</StatLabel>
          <StatNumber>{stats.totalUsers}</StatNumber>
        </Stat>
        <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <StatLabel>Active Investments</StatLabel>
          <StatNumber>{stats.activeInvestments}</StatNumber>
        </Stat>
        <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <StatLabel>Total Investment Amount</StatLabel>
          <StatNumber>${stats.totalInvestmentAmount}</StatNumber>
        </Stat>
        <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <StatLabel>Pending KYC</StatLabel>
          <StatNumber>{stats.pendingKycCount}</StatNumber>
        </Stat>
      </Grid>

      <Box bg={bgColor} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
        <Heading size="md" mb={4}>
          Recent Transactions
        </Heading>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>User</Th>
              <Th>Type</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {stats.recentTransactions.map((tx: any) => (
              <Tr key={tx.id}>
                <Td>{tx.user.email}</Td>
                <Td>{tx.type}</Td>
                <Td>${tx.amount}</Td>
                <Td>
                  <Badge
                    colorScheme={
                      tx.status === 'COMPLETED'
                        ? 'green'
                        : tx.status === 'PENDING'
                        ? 'yellow'
                        : 'red'
                    }
                  >
                    {tx.status}
                  </Badge>
                </Td>
                <Td>{new Date(tx.createdAt).toLocaleDateString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default DashboardStats;