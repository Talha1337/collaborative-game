provider "aws" {
    region = "eu-west-2"
}

data "aws_vpc" "c23" {
  filter {
    name   = "tag:Name"
    values = ["c23-VPC"]
  }
}

resource "aws_security_group" "c23_alex_ec2_miniproject_sg" {
  name        = "c23_alex_ec2_miniproject_sg"
  description = "Security group for Alex EC2 instance"
  vpc_id      = data.aws_vpc.c23.id

  tags = {
    Name = "c23_alex_ec2_miniproject_sg"
  }
}

  resource "aws_vpc_security_group_ingress_rule" "allow_ssh" {
  security_group_id = aws_security_group.c23_alex_ec2_miniproject_sg.id
  description       = "Allow SSH access"

  from_port   = 22
  to_port     = 22
  ip_protocol = "tcp"

  cidr_ipv4 = "95.214.229.28/32"
}

resource "aws_vpc_security_group_ingress_rule" "allow_flask" {
  security_group_id = aws_security_group.c23_alex_ec2_miniproject_sg.id

  description = "Allow Flask app"
  from_port   = 5000
  to_port     = 5000
  ip_protocol = "tcp"

  cidr_ipv4 = "0.0.0.0/0"
}

# Egress Rule (allow all outbound)
resource "aws_vpc_security_group_egress_rule" "allow_all_outbound" {
  security_group_id = aws_security_group.c23_alex_ec2_miniproject_sg.id

  ip_protocol = "-1"
  cidr_ipv4   = "0.0.0.0/0"
}


resource "aws_instance" "c23_alex_guo_ec2" {
  ami           = "ami-0685f8dd865c8e389"
  instance_type = "t3.micro"
  subnet_id      = "subnet-0678fc725e502c0db"
  key_name       = "c23-alex-kp"
  vpc_security_group_ids = [aws_security_group.c23_alex_ec2_miniproject_sg.id]

  associate_public_ip_address = true

  tags = {
    Name = "c23_alex_guo_ec2"
  }
}