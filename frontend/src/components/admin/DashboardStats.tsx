import { API_ENDPOINTS } from '@/config/api';
import apiClient from '@/lib/apiClient';
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
import { useQuery } from 'react-query';

interface DashboardStatsResponse {
  totalUsers: number;
  activeInvestments: number;
  totalInvestmentAmount: number;
  pendingKycCount: number;
  totalTransactionAmount?: number;
  recentTransactions: Array<{
    id: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
    user: {
      email: string;
    };
  }>;
}

const DashboardStats = () => {
  const {
    data: stats,
    isLoading,
    isError,
  } = useQuery<DashboardStatsResponse>(['admin-dashboard'], async () => {
    const response = await apiClient.get<DashboardStatsResponse>(`${API_ENDPOINTS.ADMIN}/dashboard`);
    return response.data;
  });

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  if (isError || !stats) {
    return <Box color="red.400">Unable to load dashboard metrics.</Box>;
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value ?? 0);

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
          <StatNumber>{formatCurrency(stats.totalInvestmentAmount)}</StatNumber>
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
            {stats.recentTransactions.map((transaction) => (
              <Tr key={transaction.id}>
                <Td>{transaction.user.email}</Td>
                <Td>{transaction.type}</Td>
                <Td>{formatCurrency(transaction.amount)}</Td>
                <Td>
                  <Badge
                    colorScheme={
                      transaction.status === 'COMPLETED'
                        ? 'green'
                        : transaction.status === 'PENDING'
                          ? 'yellow'
                          : 'red'
                    }
                  >
                    {transaction.status}
                  </Badge>
                </Td>
                <Td>{new Date(transaction.createdAt).toLocaleDateString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default DashboardStats;