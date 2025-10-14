import {
  Box,
  Button,
  Select,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from 'react-query';

const UserManagement = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');

  const { data: users, isLoading } = useQuery('users', () =>
    axios.get('/api/admin/users').then((res) => res.data)
  );

  const updateKycStatus = useMutation(
    ({ userId, status }) =>
      axios.put(`/api/admin/users/${userId}/kyc`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast({
          title: 'KYC Status Updated',
          status: 'success',
          duration: 3000,
        });
      },
      onError: (error) => {
        toast({
          title: 'Error updating KYC status',
          description: error.response?.data?.message || 'Something went wrong',
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  return (
    <Box bg={bgColor} p={6} borderRadius="lg">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Email</Th>
            <Th>Name</Th>
            <Th>KYC Status</Th>
            <Th>Wallet Balance</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {users.map((user) => (
            <Tr key={user.id}>
              <Td>{user.email}</Td>
              <Td>{user.name}</Td>
              <Td>
                <Select
                  value={user.kycStatus}
                  onChange={(e) =>
                    updateKycStatus.mutate({
                      userId: user.id,
                      status: e.target.value,
                    })
                  }
                  size="sm"
                  width="150px"
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </Select>
              </Td>
              <Td>${user.walletBalance}</Td>
              <Td>
                <Button size="sm" colorScheme="blue" variant="outline">
                  View Details
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default UserManagement;