import {
  Badge,
  Box,
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
import { useQuery } from 'react-query';

interface Investment {
  id: string;
  amount: number;
  status: string;
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

  const { data: investments, isLoading } = useQuery('investments', () =>
    axios.get('/api/admin/investments').then((res) => res.data)
  );

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  return (
    <Box bg={bgColor} p={6} borderRadius="lg">
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
          {investments.map((investment: Investment) => (
            <Tr key={investment.id}>
              <Td>{investment.user.email}</Td>
              <Td>{investment.plan.name}</Td>
              <Td>${investment.amount}</Td>
              <Td>
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
              </Td>
              <Td>{new Date(investment.startDate).toLocaleDateString()}</Td>
              <Td>{investment.endDate ? new Date(investment.endDate).toLocaleDateString() : 'Active'}</Td>
              <Td>${investment.currentROI.toFixed(2)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default InvestmentManagement;