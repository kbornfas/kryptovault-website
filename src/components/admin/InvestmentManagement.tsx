import { API_ENDPOINTS } from '@/config/api';
import apiClient from '@/lib/apiClient';
import {
  Badge,
  Box,
  Flex,
  HStack,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';

interface Investment {
  id: string;
  amount: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string | null;
  currentROI: number;
  user: {
    email: string;
  };
  plan: {
    name: string;
  };
}

const InvestmentManagement = () => {
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'ALL' | Investment['status']>('ALL');

  const { data: investments = [], isLoading, isError } = useQuery<Investment[]>(
    ['admin-investments'],
    async () => {
      const response = await apiClient.get<Investment[]>(`${API_ENDPOINTS.ADMIN}/investments`);
      return response.data;
    },
    {
      staleTime: 30_000,
    },
  );

  const updateInvestmentStatus = useMutation(
    ({ investmentId, status }: { investmentId: string; status: Investment['status'] }) =>
      apiClient.put(`${API_ENDPOINTS.ADMIN}/investments/${investmentId}/status`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-investments']);
        toast({
          title: 'Investment updated',
          status: 'success',
          duration: 3000,
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Unable to update investment',
          description: error?.response?.data?.message || 'Please try again later.',
          status: 'error',
        });
      },
    },
  );

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  if (isError) {
    return <Box color="red.400">Unable to load investments right now.</Box>;
  }

  const visibleInvestments = statusFilter === 'ALL'
    ? investments
    : investments.filter((investment) => investment.status === statusFilter);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value ?? 0);

  return (
    <Box bg={bgColor} p={6} borderRadius="lg">
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
        <Text fontSize="lg" fontWeight="semibold">
          Investments
        </Text>
        <HStack spacing={3}>
          <Text fontSize="sm">Filter by status</Text>
          <Select
            size="sm"
            width="170px"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </HStack>
      </Flex>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>User</Th>
            <Th>Plan</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th>Start Date</Th>
            <Th>End Date</Th>
            <Th>ROI</Th>
          </Tr>
        </Thead>
        <Tbody>
          {visibleInvestments.map((investment) => (
            <Tr key={investment.id}>
              <Td>{investment.user.email}</Td>
              <Td>{investment.plan.name}</Td>
              <Td>{formatCurrency(investment.amount)}</Td>
              <Td>
                <HStack spacing={2}>
                  <Badge
                    colorScheme={
                      investment.status === 'ACTIVE'
                        ? 'green'
                        : investment.status === 'COMPLETED'
                          ? 'blue'
                          : 'yellow'
                    }
                  >
                    {investment.status}
                  </Badge>
                  <Select
                    size="sm"
                    width="160px"
                    value={investment.status}
                    isDisabled={updateInvestmentStatus.isLoading}
                    onChange={(event) =>
                      updateInvestmentStatus.mutate({
                        investmentId: investment.id,
                        status: event.target.value as Investment['status'],
                      })
                    }
                  >
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Select>
                </HStack>
              </Td>
              <Td>{new Date(investment.startDate).toLocaleDateString()}</Td>
              <Td>{investment.endDate ? new Date(investment.endDate).toLocaleDateString() : 'Active'}</Td>
              <Td>{formatCurrency(investment.currentROI)}</Td>
            </Tr>
          ))}
          {visibleInvestments.length === 0 && (
            <Tr>
              <Td colSpan={7} textAlign="center" py={6}>
                No investments found.
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </Box>
  );
};

export default InvestmentManagement;