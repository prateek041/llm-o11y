# Talk to your infrastructure in natural language and diagnose

This configuration consists of 4 components that replicate the working of the
solution in a bigger context.

- JanusGraph graph database.
- Python (FastAPI) Data service.
- Bun (Javascript) based LLM service.
- Go based CLI to interact with system.

## JanusGraph Database

This database consists of a graph representation of a typical infrastructure
environment. It has vertices and edges, where vertices represent the individual
components of the infrastructure, like compute, storage, VPCs, Security groups etc.

For a production grade system, this can be directly replaced by any database that
is Gremlin compliant. AWS has solutions like "Workload Discovery", where the
entire infrastructure is represented in terms of vertices and edges. The data is
then stored in a "Neptune" cluster.

## Python service

This is the data service, that directly interacts with the Graph Database, using
Gremlin queries. It also has endpoints that can be used to properly understand the
structure of the graph database. Including edges, vertices and the entire schema.

## Bun LLM service

This is the layer that adds intelligence to the system, it consists of a bun +
express web server that interacts with LLMs like OpenAI's gpt-4.1 etc. This
server also interacts with the Python service to get access to query running
capabilities and to understand the schema of the graph database.

The system consists of an Agent named **Aura**, that can interact with the user
queries directly and intelligently decide when to run Gremlin queries (through
tool calls) and then answers the user's question in simple language.

## Go CLI

This is the interactive interface that the user can use to directly interact with
the system. It is a simple interface where the user can ask questions and the
system responds.

## Running things locally

- Use the `env.example` file that is required to attach LLM integration to the
  `server` service.

- There is an attached `docker-compose.yml` file, use that to start all the
  services along with the database.

```shell
docker compose up --build
```

Once everything starts running, run the cli (or build on your own). (There is
a pre-built binary named `llm-observability`)

```shell
./llm-observability
```

## Test questions

To test the working of the system, I have included a `dummy_data.groovy`, that
represents a Kubernetes cluster based on AWS services. You can ask the following
questions to the system.

### Question 1: Asset Inventory

**Question:** "What are the assets I have in AWS?"

**Expected Answer:** "Your primary assets include an EC2 cluster managed by the
'app-cluster-asg' Auto Scaling Group, which contains 2 running nodes. This cluster
is served by a Load Balancer, connects to an RDS database, and uses an S3 bucket
named 'app-cluster-backup-logs'. You also have a 'backup-log-processor' Lambda
function and a separate 'bastion-host' instance."

**Reasoning:** Requires a broad query to summarize the different vertex types
(g.V().label().groupCount()) and then a synthesis of the results into a
human-readable paragraph.

### Question 2: Cluster Status

**Question:** "What is the current status of my EC2 cluster?"

**Expected Answer:** "The cluster, managed by Auto Scaling Group 'app-cluster-asg',
is configured for a desired capacity of 2 instances. Currently, it is managing 2
running instances: app-node-1 and app-node-2."

**Reasoning:** The agent must correctly identify the AutoScalingGroup as the
representation of the "cluster," then traverse the manages edges to find the EC2
instances and report their status.

**Gremlin:** g.V().has('AutoScalingGroup', 'name', 'app-cluster-asg').as('asg').
out('manages').as('nodes').select('asg', 'nodes').by(valueMap()).
by(values('name').fold())

### Question 3: Cluster Load

**Question:** "What is the current load of my cluster?"

**Expected Answer:** "The average CPU utilization across the 2 nodes in the
'app-cluster-asg' is 70%. Node app-node-1 is at 65% and app-node-2 is at 75%."

**Reasoning:** The agent must find all instances managed by the ASG, access their
cpuUtilization property, and calculate the average.

**Gremlin:** g.V().has('AutoScalingGroup', 'name', 'app-cluster-asg').
out('manages').values('cpuUtilization').mean()

### Question 4: S3 Bucket Integration

**Question:** "What interacts with the 'app-cluster-backup-logs' S3 bucket?"

**Expected Answer:** "The S3 bucket app-cluster-backup-logs has two interactions:

1. The 'backup-log-processor' Lambda function is triggered by it. 2) The
   application nodes have a role ('AppNodeRole') with writes_to permission for this
   bucket."

**Reasoning:** This is a great graph problem. The agent needs to find the S3
bucket vertex and then traverse all incoming and outgoing edges to find every
connected resource and explain the relationship based on the edge label.

**Gremlin:** g.V().has('S3Bucket', 'name', 'app-cluster-backup-logs').bothE().
as('edge').otherV().as('resource').select('edge', 'resource').by(label).
by(valueMap('name', 'functionName', 'roleName'))

### Question 5: Lambda Function Trigger

**Question:** "What is the trigger for the 'backup-log-processor' Lambda function?"

**Expected Answer:** "The 'backup-log-processor' Lambda function is triggered by
events in the S3 bucket 'app-cluster-backup-logs'."

**Reasoning:** Simple but important traversal. Start at the Lambda vertex and
follow the triggered_by edge to its destination.

**Gremlin:** g.V().has('LambdaFunction', 'functionName', 'backup-log-processor').
out('triggered_by').values('name')

### Question 6: Multi-Hop Security Path

**Question:** "Show me the instances that can connect to the database on the MySQL
port 3306."

**Expected Answer:** "Based on the security group rules, the instances with
network access to the 'app-cluster-db' on port 3306 are app-node-1 and
app-node-2."

**Reasoning:** This remains the ultimate test. The agent must ignore the
connects_to edge and trace the network path: RDSInstance -> uses_sg -> sg-db <-
allows_ingress (on port 3306) <- sg-app <- uses_sg <- EC2Instance.

**Gremlin:** g.V().has('RDSInstance', 'dbInstanceIdentifier', 'app-cluster-db').
out('uses_sg').inE('allows_ingress').has('port', 3306).outV().in('uses_sg').
hasLabel('EC2Instance').values('name').toList()

### Question 7: Public Exposure

**Question:** "Which parts of my infrastructure are publicly exposed?"

**Expected Answer:** "There are two points of public exposure: 1) The application
load balancer with DNS name 'cluster-lb.us-east-1.elb.amazonaws.com' is designed
to receive public traffic. 2) The 'bastion-host' EC2 instance has a public IP
address of 54.1.2.3."

**Reasoning:** The agent must understand that "public exposure" can mean different
things. It should query for LoadBalancer vertices and any EC2Instance vertices
that have a publicIp property.

**Gremlin 1:** g.V().hasLabel('LoadBalancer').values('dnsName')
**Gremlin 2:** g.V().has('publicIp').valueMap('name', 'publicIp')

### Question 8: IAM Permissions

**Question:** "What AWS resources can the application nodes write to?"

**Expected Answer:** "The application nodes (e.g., app-node-1) assume the
'AppNodeRole'. This role has writes_to permission for the S3 bucket
'app-cluster-backup-logs'."

**Reasoning:** This requires a two-hop traversal: EC2Instance -> assumes_role ->
IAMRole -> writes_to -> S3Bucket.

**Gremlin:** g.V().has('EC2Instance', 'name', 'app-node-1').out('assumes_role').
out('writes_to').path().by('name').by('roleName').by('name')

### Question 9: Finding Unused Resources

**Question:** "Are there any running EC2 instances that are not part of the main
cluster?"

**Expected Answer:** "No. All currently running EC2 instances (app-node-1,
app-node-2) are managed by the 'app-cluster-asg'. The only other instance,
'bastion-host', is currently stopped."

**Reasoning:** The agent must find all running EC2 instances and then filter out
the ones that have an incoming manages edge from the ASG. The result should be an
empty set, confirming all running instances are part of the cluster.

**Gremlin:** g.V().has('EC2Instance', 'status', 'running').not(inE('manages')).
count()

### Question 10: High Availability Check

**Question:** "How is the application load balancer configured for high
availability?"

**Expected Answer:** "The load balancer ensures high availability by distributing
traffic across multiple targets. It currently targets 2 instances: app-node-1 and
app-node-2."

**Reasoning:** A straightforward query to show the agent can understand concepts
like HA by looking at the number of targets for a load balancer.

**Gremlin:** g.V().hasLabel('LoadBalancer').out('targets').count()
