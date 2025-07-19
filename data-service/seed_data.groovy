g.V().drop().iterate();

g.addV('VPC').property('vpcId', 'vpc-01').property('name', 'prod-vpc').as('prod_vpc').
  addV('K8sCluster').property('name', 'main-cluster').property('version', '1.28').property('load_percentage', 65).as('k8s').
  addV('Subnet').property('subnetId', 'subnet-01a').property('name', 'private-subnet-a').as('sub_a').
  addV('Subnet').property('subnetId', 'subnet-01b').property('name', 'private-subnet-b').as('sub_b').
  addV('EC2Instance').property('instanceId', 'i-111').property('instanceType', 't3.medium').property('status', 'running').property('name', 'k8s-worker-01').as('node1').
  addV('EC2Instance').property('instanceId', 'i-222').property('instanceType', 't3.medium').property('status', 'running').property('name', 'k8s-worker-02').as('node2').
  addV('EC2Instance').property('instanceId', 'i-333').property('instanceType', 't2.micro').property('status', 'stopped').property('name', 'bastion-host').as('bastion').
  addV('S3Bucket').property('name', 'my-app-logs-2023').property('creationDate', '2023-10-26').as('logs_bucket').

  addE('contains').from('prod_vpc').to('sub_a').
  addE('contains').from('prod_vpc').to('sub_b').
  addE('runs_in').from('node1').to('sub_a').
  addE('runs_in').from('node2').to('sub_a').
  addE('runs_in').from('bastion').to('sub_b').
  addE('member_of').from('node1').to('k8s').
  addE('member_of').from('node2').to('k8s').

// The server will execute this as a single transaction.
// g.getGraph().tx().commit();
iterate();
