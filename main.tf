terraform {

  backend "azurerm" {
    storage_account_name = "dysonic"
    container_name       = "tfstate"
    key                  = "tx-data-api.terraform.tfstate"
    resource_group_name  = "dysonic-devops"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
    # postgresql = {
    #   source  = "cyrilgdn/postgresql"
    #   version = "~> 1.21.0"
    # }
  }

  required_version = ">= 1.2.0"
}

// PROVIDERS
provider "aws" {
  region  = var.aws_region
}

# provider "postgresql" {
#   host            = aws_db_instance.postgres.address
#   port            = var.postgres_port
#   database        = var.postgres_database_name
#   username        = var.postgres_username
#   password        = var.postgres_password
#   sslmode         = "require"
#   connect_timeout = 15
#   superuser       = false
# }


# // POSTGRES
# resource "aws_security_group" "postgres" {
#   name = "postgres"
# }

# resource "aws_vpc_security_group_ingress_rule" "postgres" {
#   security_group_id = aws_security_group.postgres.id

#   cidr_ipv4   = "0.0.0.0/0"
#   from_port   = var.postgres_port
#   ip_protocol = "tcp"
#   to_port     = var.postgres_port
# }

# # Do I need both of these?
# # resource "aws_vpc_security_group_ingress_rule" "postgres" {
# #   security_group_id = aws_security_group.postgres.id

# #   cidr_ipv4   = "0.0.0.0/0"
# #   from_port   = var.postgres_port
# #   ip_protocol = "tcp"
# #   to_port     = var.postgres_port
# # }

# resource "aws_db_subnet_group" "default" {
#   name       = "main"
#   subnet_ids = [aws_subnet.subnet1.id, aws_subnet.subnet2.id]

#   tags = {
#     Name = "My DB subnet group"
#   }
# }

# resource "aws_db_instance" "default" {
#   allocated_storage      = 20
#   storage_type           = "gp2"
#   engine                 = "mysql"
#   engine_version         = "8.2"
#   instance_class         = "db.t2.micro"
#   username               = var.db_username
#   password               = var.db_password
#   identifier             = var.db_identifier
#   # publicly_accessible    = true
#   # parameter_group_name   = "default.postgres12"
#   # vpc_security_group_ids = [aws_security_group.postgres.id]
#   parameter_group_name     = "default.mysql8.2"
#   db_subnet_group_name     = aws_db_subnet_group.default.id
#   skip_final_snapshot    = true
# }

# # resource "postgresql_role" "user_name" {
# #   name                = var.postgres_username
# #   login               = true
# #   password            = var.postgres_password
# #   encrypted_password  = true
# #   create_database     = true
# #   create_role         = true
# #   skip_reassign_owned = true
# # }

# output "address" {
#   description = "The address of the RDS instance"
#   value       = aws_db_instance.default.address
# }

# output "arn" {
#   description = "The ARN of the RDS instance"
#   value       = aws_db_instance.default.arn
# }


resource "aws_s3_bucket" "example" {
  bucket = "dysonic-tx-data"

  tags = {
    Name        = "My bucket"
    Environment = "Dev"
  }
}

