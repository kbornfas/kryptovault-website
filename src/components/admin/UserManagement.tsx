import { API_ENDPOINTS } from '@/config/api';
import apiClient from '@/lib/apiClient';
import {
  Box,
  Button,
  Flex,
  Heading,
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
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';

interface User {
  id: string;
  email: string;
  name: string;
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  walletBalance: string | number;
  role: string;
  createdAt?: string;
  lastLoginAt?: string | null;
}

interface UpdateKycParams {
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const KYC_FILTER_OPTIONS: Array<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'> = [
  'ALL',
  'PENDING',
  'APPROVED',
  'REJECTED',
];

const UserManagement = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const [kycFilter, setKycFilter] = useState<(typeof KYC_FILTER_OPTIONS)[number]>('ALL');

  const {
    data: users = [],
    isLoading,
    isError,
  } = useQuery<User[]>(
    ['admin-users'],
    async () => {
      const response = await apiClient.get<User[]>(`${API_ENDPOINTS.ADMIN}/users`);
      return response.data;
    },
    {
      staleTime: 30_000,
    },
  );

  const updateKycStatus = useMutation<unknown, unknown, UpdateKycParams>(
    ({ userId, status }) =>
      apiClient.put(`${API_ENDPOINTS.ADMIN}/users/${userId}/kyc`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users']);
        toast({
          title: 'KYC status updated',
          status: 'success',
          duration: 3000,
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Unable to update KYC status',
          description: error?.response?.data?.message || 'Please try again later.',
          status: 'error',
          duration: 4000,
        });
      },
    },
  );

  const filteredUsers = useMemo(() => {
    if (kycFilter === 'ALL') {
      return users;
    }

    return users.filter((user) => user.kycStatus === kycFilter);
  }, [users, kycFilter]);

  const formatCurrency = (value: string | number) => {
    const amount = typeof value === 'string' ? Number(value) : value;
    if (Number.isNaN(amount)) {
      return '$0.00';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount ?? 0);
  };

  if (isLoading) {
    return <Box>Loading users...</Box>;
  }

  if (isError) {
    return (
      <Box color="red.400" fontWeight="medium">
        Unable to load users right now. Please try again shortly.
      </Box>
    );
  }

  return (
    <Box bg={bgColor} p={6} borderRadius="lg">
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
        <Heading size="md">User Accounts</Heading>
        <Flex align="center" gap={3}>
          <Text fontSize="sm" fontWeight="medium">
            Filter by KYC
          </Text>
          <Select
            value={kycFilter}
            onChange={(event) => setKycFilter(event.target.value as typeof kycFilter)}
            size="sm"
            width="180px"
          >
            {KYC_FILTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </Flex>
      </Flex>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Email</Th>
            <Th>Name</Th>
            <Th>Role</Th>
            <Th>KYC Status</Th>
            <Th isNumeric>Wallet Balance</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredUsers.map((user) => (
            <Tr key={user.id}>
              <Td>{user.email}</Td>
              <Td>{user.name || 'N/A'}</Td>
              <Td>{user.role || 'USER'}</Td>
              <Td>
                <Select
                  value={user.kycStatus}
                  onChange={(event) =>
                    updateKycStatus.mutate({
                      userId: user.id,
                      status: event.target.value as UpdateKycParams['status'],
                    })
                  }
                  size="sm"
                  width="150px"
                  isDisabled={updateKycStatus.isLoading}
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </Select>
              </Td>
              <Td isNumeric>{formatCurrency(user.walletBalance)}</Td>
              <Td>
                <Button size="sm" variant="outline" colorScheme="blue">
                  View Details
                </Button>
              </Td>
            </Tr>
          ))}
          {filteredUsers.length === 0 && (
            <Tr>
              <Td colSpan={6} textAlign="center" py={6}>
                No users found for this filter.
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </Box>
  );
};

export default UserManagement;