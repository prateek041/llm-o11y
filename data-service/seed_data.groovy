g.V().drop().iterate();

def cluster_asg = g.addV('AutoScalingGroup').property('name', 'app-cluster-asg').property('desiredCapacity', 2).property('instanceType', 't3.medium').next();
def alb         = g.addV('LoadBalancer').property('type', 'application').property('dnsName', 'cluster-lb.us-east-1.elb.amazonaws.com').next();
def db          = g.addV('RDSInstance').property('dbInstanceIdentifier', 'app-cluster-db').property('engine', 'mysql').next();
def s3_bucket   = g.addV('S3Bucket').property('name', 'app-cluster-backup-logs').next();
def lambda      = g.addV('LambdaFunction').property('functionName', 'backup-log-processor').property('runtime', 'python3.9').next();
def sg_lb       = g.addV('SecurityGroup').property('groupId', 'sg-lb').property('description', 'Allows public web traffic to LB').next();
def sg_app      = g.addV('SecurityGroup').property('groupId', 'sg-app').property('description', 'Allows traffic from LB to app nodes').next();
def sg_db       = g.addV('SecurityGroup').property('groupId', 'sg-db').property('description', 'Allows traffic from app nodes to DB').next();
def app_role    = g.addV('IAMRole').property('roleName', 'AppNodeRole').property('description', 'Permissions for app tier EC2 instances').next();
def lambda_role = g.addV('IAMRole').property('roleName', 'LambdaS3ReaderRole').property('description', 'Allows Lambda to read from S3').next();
def node1       = g.addV('EC2Instance').property('instanceId', 'i-111').property('name', 'app-node-1').property('status', 'running').property('cpuUtilization', 65).next();
def node2       = g.addV('EC2Instance').property('instanceId', 'i-222').property('name', 'app-node-2').property('status', 'running').property('cpuUtilization', 75).next();
def bastion     = g.addV('EC2Instance').property('instanceId', 'i-333').property('name', 'bastion-host').property('status', 'stopped').property('publicIp', '54.1.2.3').next();

// Infrastructure management relationships
g.addE('manages').from(cluster_asg).to(node1).iterate();
g.addE('manages').from(cluster_asg).to(node2).iterate();
  
// Network path relationships
g.addE('targets').from(alb).to(node1).iterate();
g.addE('targets').from(alb).to(node2).iterate();

// Security relationships
g.addE('uses_sg').from(alb).to(sg_lb).iterate();
g.addE('uses_sg').from(node1).to(sg_app).iterate();
g.addE('uses_sg').from(node2).to(sg_app).iterate();
g.addE('uses_sg').from(db).to(sg_db).iterate();

// Security Group Rules (Firewall)
g.addE('allows_ingress').from(sg_lb).to(sg_app).property('port', 8080).property('protocol', 'tcp').iterate();
g.addE('allows_ingress').from(sg_app).to(sg_db).property('port', 3306).property('protocol', 'tcp').iterate();

// IAM Permission relationships
g.addE('assumes_role').from(node1).to(app_role).iterate();
g.addE('assumes_role').from(node2).to(app_role).iterate();
g.addE('assumes_role').from(lambda).to(lambda_role).iterate();

// Service dependency and data flow relationships
g.addE('writes_to').from(app_role).to(s3_bucket).iterate();
g.addE('triggered_by').from(lambda).to(s3_bucket).iterate();
g.addE('reads_from').from(lambda_role).to(s3_bucket).iterate();
g.addE('connects_to').from(node1).to(db).iterate();
g.addE('connects_to').from(node2).to(db).iterate();

// Return a success message to indicate completion. This is good practice.
"Data loading complete.";
